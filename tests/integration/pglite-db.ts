// A real Postgres (PGlite, in memory) with PostGIS and pg_trgm, migrated with
// db/migrations, standing in for lib/db in integration tests:
//
//   vi.mock("@/lib/db", () => import("../integration/pglite-db"));
//
// Queries run as written, so wrong column names or bad SQL fail here instead
// of in production.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { postgis } from "@electric-sql/pglite-postgis";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "@/lib/db/schema";

const migrations = join(process.cwd(), "db/migrations");
const journal = JSON.parse(readFileSync(join(migrations, "meta/_journal.json"), "utf8")) as {
  entries: Array<{ tag: string }>;
};

const client = new PGlite({ extensions: { postgis, pg_trgm } });
// Supabase's roles have the extensions schema on their search_path.
await client.exec("SET search_path TO public, extensions");
async function apply(tag: string) {
  for (const statement of readFileSync(join(migrations, `${tag}.sql`), "utf8").split(
    "--> statement-breakpoint",
  )) {
    if (statement.trim()) await client.exec(statement);
  }
}
for (const { tag } of journal.entries) await apply(tag);

export const db = drizzle(client, { schema });
export const pglite = client;
