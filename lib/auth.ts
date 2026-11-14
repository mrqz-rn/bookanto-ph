import "server-only";

import type { AuthError } from "@supabase/supabase-js";
import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";

import type { AuthzUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { shopMembers, users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Auth adapter. Supabase Auth today; only this file changes for Cognito.

export type CurrentUser = AuthzUser & {
  authId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

/**
 * The signed-in user with their active shop memberships, or null. Also null
 * when the session is valid but the users row doesn't exist yet (sign-up not
 * finished) or the account is deleted. Cached for the request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;
  if (!authId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.authId, authId), isNull(users.deletedAt)))
    .limit(1);
  if (!user) return null;

  const memberships = await db
    .select({ shopId: shopMembers.shopId, role: shopMembers.role })
    .from(shopMembers)
    .where(and(eq(shopMembers.userId, user.id), eq(shopMembers.active, true)));

  return {
    id: user.id,
    authId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    platformRole: user.platformRole,
    status: user.status,
    memberships,
  };
});

/** The signed-in user, or an UNAUTHENTICATED error. Step 1 of every action. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}

/**
 * Texts a one-time code to an E.164 phone number. Supabase Auth checks the
 * Turnstile token before sending.
 */
export async function sendOtp(phone: string, captchaToken: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { captchaToken } });
  if (error) throw toAppError(error);
}

/** Checks the code and starts a session. Returns the auth provider's user id. */
export async function verifyOtp(phone: string, code: string): Promise<{ authId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw toAppError(error);
  if (!data.user) throw new AppError("INTERNAL");
  return { authId: data.user.id };
}

/** Ends this session, or every session of the user with scope "global". */
export async function signOut(scope: "local" | "global" = "local"): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw toAppError(error);
}

function toAppError(error: AuthError): AppError {
  if (error.status === 429) return new AppError("RATE_LIMITED");
  if (error.code === "otp_expired") {
    return new AppError(
      "VALIDATION",
      "That code is wrong or has expired. Please request a new one.",
    );
  }
  if (error.code === "captcha_failed") {
    return new AppError("VALIDATION", "Please finish the security check and try again.");
  }
  console.error(error);
  return new AppError("INTERNAL");
}
