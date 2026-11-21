// Gives an existing account a platform role. The only way to create the first
// super admin (the founder's account): in the app, only a super admin can
// change roles. Run it against each environment's database once.
//
//   pnpm admin:grant founder@example.com                # super_admin
//   pnpm admin:grant ops@example.com --role admin
//   pnpm admin:grant someone@example.com --role customer   # take admin away
//
// The person must have signed in once (so their account exists). Recorded in
// the audit log as a system action.
import { loadEnvConfig } from "@next/env";
import { and, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../lib/db/schema";
import { PLATFORM_ROLES, type PlatformRole } from "../lib/db/schema/enums";

loadEnvConfig(process.cwd());

export function parseArgs(argv: string[]): { email: string; role: PlatformRole } {
  const args = [...argv];
  let role: PlatformRole = "super_admin";
  const roleIndex = args.indexOf("--role");
  if (roleIndex !== -1) {
    const value = args[roleIndex + 1];
    if (!value || !(PLATFORM_ROLES as readonly string[]).includes(value)) {
      throw new Error(`--role must be one of: ${PLATFORM_ROLES.join(", ")}`);
    }
    role = value as PlatformRole;
    args.splice(roleIndex, 2);
  }
  const email = args[0]?.trim().toLowerCase();
  if (!email || !email.includes("@") || args.length !== 1) {
    throw new Error("Usage: pnpm admin:grant <email> [--role super_admin|admin|customer]");
  }
  return { email, role };
}

async function main() {
  const { email, role } = parseArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  try {
    const [user] = await db
      .select({ id: schema.users.id, name: schema.users.name, role: schema.users.platformRole })
      .from(schema.users)
      .where(and(sql`lower(${schema.users.email}) = ${email}`, isNull(schema.users.deletedAt)))
      .limit(1);
    if (!user) {
      throw new Error(`No account with ${email}. Sign in to BooKanto with it once, then rerun.`);
    }
    if (user.role === role) {
      console.log(`${email} is already ${role}. Nothing changed.`);
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.users)
        .set({ platformRole: role, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
      await tx.insert(schema.auditLog).values({
        actorId: null,
        action: "user.role_changed",
        targetType: "user",
        targetId: user.id,
        data: { oldRole: user.role, newRole: role, via: "cli" },
      });
    });

    const host = new URL(url).host;
    console.log(`${email}: ${user.role} → ${role} (database ${host}).`);
    if (role !== "customer") {
      console.log(
        "Sign out and back in. In production /admin asks you to set up two-factor first.",
      );
    }
  } finally {
    await client.end();
  }
}

// Run only as a script, so tests can import parseArgs.
if (process.argv[1]?.endsWith("grant-role.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
