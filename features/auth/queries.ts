import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";

import { passwordResetTokenSchema } from "./schema";

/** Only this hash of a reset token is stored; the token lives in the email. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ResetLinkState = "valid" | "expired" | "used" | "invalid";

/**
 * What a reset link is good for, without using it up. Opening the page must
 * not claim the link: mail scanners open links before people do.
 */
export async function getResetLinkState(
  token: string | undefined,
  now = new Date(),
): Promise<ResetLinkState> {
  if (!token || !passwordResetTokenSchema.safeParse(token).success) return "invalid";
  const [row] = await db
    .select({ usedAt: passwordResetTokens.usedAt, expiresAt: passwordResetTokens.expiresAt })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashResetToken(token)))
    .limit(1);
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt <= now) return "expired";
  return "valid";
}
