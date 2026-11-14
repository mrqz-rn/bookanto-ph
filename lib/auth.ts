import "server-only";

import type { AuthError } from "@supabase/supabase-js";
import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";

import { writeAudit } from "@/lib/audit";
import type { AuthzUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { shopMembers, users, type User } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { publicEnv } from "@/lib/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Auth adapter. Supabase Auth today; only this file changes for Cognito.

export type CurrentUser = AuthzUser & {
  authId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type OAuthProvider = "google" | "facebook";

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

  let [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.authId, authId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    try {
      const synced = await syncAuthUser({ authId });
      if (synced && !synced.deletedAt) {
        user = synced;
      }
    } catch {
      return null;
    }
  }

  if (!user || user.deletedAt) return null;

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
 * Ensures a user record exists in the database for the given authId,
 * linking to existing records by phone or email if possible, or inserting a new row.
 */
export async function syncAuthUser(hints?: {
  authId?: string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  let authId = hints?.authId;
  let email = hints?.email;
  let phone = hints?.phone;
  let name = hints?.name;

  if (!authId || !email || !name || !phone) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      authId = authId ?? data.user.id;
      email = email ?? data.user.email ?? null;
      phone = phone ?? data.user.phone ?? null;
      const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
      const metaName = (metadata?.full_name ?? metadata?.name ?? metadata?.user_name) as
        string | undefined;
      name = name ?? metaName ?? null;
    }
  }

  if (!authId) return null;

  // 1. Check if user already exists by authId
  const [existingByAuthId] = await db.select().from(users).where(eq(users.authId, authId)).limit(1);

  if (existingByAuthId) {
    if (existingByAuthId.deletedAt) return null;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (!existingByAuthId.name && name) updates.name = name;
    if (!existingByAuthId.email && email) updates.email = email;
    if (!existingByAuthId.phone && phone) updates.phone = phone;

    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, existingByAuthId.id))
        .returning();
      return updated ?? existingByAuthId;
    }
    return existingByAuthId;
  }

  // 2. Check if a user with matching phone already exists
  if (phone) {
    const [existingByPhone] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1);

    if (existingByPhone) {
      const [updated] = await db
        .update(users)
        .set({
          authId,
          ...(name && !existingByPhone.name ? { name } : {}),
          ...(email && !existingByPhone.email ? { email } : {}),
        })
        .where(eq(users.id, existingByPhone.id))
        .returning();
      return updated ?? existingByPhone;
    }
  }

  // 3. Check if a user with matching email already exists
  if (email) {
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (existingByEmail) {
      const [updated] = await db
        .update(users)
        .set({
          authId,
          ...(name && !existingByEmail.name ? { name } : {}),
          ...(phone && !existingByEmail.phone ? { phone } : {}),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();
      return updated ?? existingByEmail;
    }
  }

  // 4. Create new customer user
  const [created] = await db
    .insert(users)
    .values({
      authId,
      phone: phone ?? null,
      email: email ?? null,
      name: name ?? null,
      platformRole: "customer",
      status: "active",
    })
    .returning();

  if (created) {
    await writeAudit({
      actorId: created.id,
      action: "user.registered",
      targetType: "user",
      targetId: created.id,
      data: { authId, hasPhone: !!phone, hasEmail: !!email },
    });
  }

  return created ?? null;
}

/**
 * Texts a one-time code to an E.164 phone number. Supabase Auth checks the
 * Turnstile token before sending when configured.
 */
export async function sendOtp(phone: string, captchaToken?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const options = captchaToken ? { captchaToken } : undefined;
  const { error } = await supabase.auth.signInWithOtp({ phone, options });
  if (error) throw toAppError(error);
}

/** Checks the code and starts a session. Returns the auth provider's user id. */
export async function verifyOtp(phone: string, code: string): Promise<{ authId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw toAppError(error);
  if (!data.user) throw new AppError("INTERNAL");
  await syncAuthUser({ authId: data.user.id, phone: data.user.phone ?? phone });
  return { authId: data.user.id };
}

/** Sends a one-time verification code or magic link to an email address. */
export async function sendEmailOtp(email: string, captchaToken?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const options = {
    ...(captchaToken ? { captchaToken } : {}),
    emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  };
  const { error } = await supabase.auth.signInWithOtp({ email, options });
  if (error) throw toAppError(error);
}

/** Checks the email code and starts a session. Returns the auth provider's user id. */
export async function verifyEmailOtp(email: string, code: string): Promise<{ authId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw toAppError(error);
  if (!data.user) throw new AppError("INTERNAL");
  await syncAuthUser({ authId: data.user.id, email: data.user.email ?? email });
  return { authId: data.user.id };
}

/** Generates the OAuth authorization URL for Google or Facebook sign-in. */
export async function getOAuthSignInUrl(
  provider: OAuthProvider,
  next = "/account",
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const safeNext = next.startsWith("/") ? next : "/account";
  const redirectTo = `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw toAppError(error);
  if (!data.url) throw new AppError("INTERNAL");
  return data.url;
}

/** Exchanges an OAuth or magic link code for a verified Supabase session. */
export async function exchangeAuthCode(code: string): Promise<{ authId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw toAppError(error);
  if (!data.user) throw new AppError("INTERNAL");
  await syncAuthUser({
    authId: data.user.id,
    email: data.user.email,
    phone: data.user.phone,
  });
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
  const msg = error.message.toLowerCase();
  if (error.code === "otp_expired" || msg.includes("expired")) {
    return new AppError(
      "VALIDATION",
      "That code is wrong or has expired. Please request a new one.",
    );
  }
  if (error.code === "captcha_failed") {
    return new AppError("VALIDATION", "Please finish the security check and try again.");
  }
  if (
    msg.includes("invalid token") ||
    msg.includes("token has expired") ||
    error.code === "bad_code"
  ) {
    return new AppError("VALIDATION", "Invalid verification code. Please check and try again.");
  }
  console.error(error);
  return new AppError("INTERNAL");
}
