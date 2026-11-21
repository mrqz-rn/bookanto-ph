import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthError } from "@supabase/supabase-js";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";

import {
  DEFAULT_AUTH_REDIRECT,
  SAMPLE_ACCOUNTS,
  type SampleAccountRole,
} from "@/features/auth/constants";
import { writeAudit } from "@/lib/audit";
import type { AuthzUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  barangays,
  businessHours,
  categories,
  cities,
  services,
  shopCategories,
  shopMembers,
  shops,
  userAddresses,
  users,
  type User,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { publicEnv } from "@/lib/public-env";
import { getRequestOrigin } from "@/lib/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  let authId = hints?.authId?.trim() || undefined;
  let email = hints?.email?.trim() || null;
  let phone = hints?.phone?.trim() || null;
  let name = hints?.name?.trim() || null;

  if (phone) {
    const normalized = normalizePhone(phone);
    phone = /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
  }

  const hasProfileHints =
    hints !== undefined && (Boolean(email) || Boolean(phone) || Boolean(name));

  if (!authId || !hasProfileHints) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      authId = authId ?? (data.user.id?.trim() || undefined);
      email = email ?? (data.user.email?.trim() || null);
      const rawUserPhone = data.user.phone?.trim() || null;
      if (!phone && rawUserPhone) {
        const normalized = normalizePhone(rawUserPhone);
        phone = /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
      }
      const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
      const metaName = (metadata?.full_name ?? metadata?.name ?? metadata?.user_name) as
        string | undefined;
      name = name ?? (metaName?.trim() || null);
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
      phone: phone || null,
      email: email || null,
      name: name || null,
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

function isAllowedRedirectOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const siteUrl = new URL(publicEnv.NEXT_PUBLIC_SITE_URL);
    if (parsed.origin === siteUrl.origin) return true;
    if (parsed.origin === "https://bookanto-ph.vercel.app") return true;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    return false;
  } catch {
    return false;
  }
}

async function resolveAuthBaseUrl(requestedOrigin?: string): Promise<string> {
  if (requestedOrigin && isAllowedRedirectOrigin(requestedOrigin)) {
    return requestedOrigin.replace(/\/$/, "");
  }
  const requestOrigin = await getRequestOrigin();
  if (requestOrigin && isAllowedRedirectOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }
  return publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

/** Sends a one-time verification code or magic link to an email address. */
export async function sendEmailOtp(email: string, captchaToken?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const baseUrl = await resolveAuthBaseUrl();
  const options = {
    ...(captchaToken ? { captchaToken } : {}),
    emailRedirectTo: `${baseUrl}/auth/callback`,
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

/** Checks Supabase Auth settings to verify the OAuth provider is enabled before redirecting. */
async function assertOAuthProviderEnabled(provider: OAuthProvider): Promise<void> {
  const providerLabel = provider === "google" ? "Google" : "Facebook";
  let isEnabled: boolean | undefined;

  try {
    const response = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const settings = (await response.json()) as {
        external?: Record<string, boolean>;
      };
      isEnabled = settings.external?.[provider];
    }
  } catch {
    // Network unreachable or mocked environment; let signInWithOAuth proceed.
    return;
  }

  if (isEnabled === false) {
    throw new AppError(
      "VALIDATION",
      `${providerLabel} sign-in is not enabled in Supabase Auth yet. Enable the ${providerLabel} provider in your Supabase Dashboard (Authentication → Sign In / Providers) or sign in with Phone or Email.`,
    );
  }
}

const GOOGLE_OAUTH_STATE_PREFIX = "g1.";
const GOOGLE_OAUTH_STATE_MAX_AGE_MS = 15 * 60 * 1000;

type GoogleOAuthStatePayload = {
  /** Raw unhashed nonce; SHA-256 hex is sent to Google and raw is passed to signInWithIdToken. */
  n: string;
  /** Post-login relative redirect target. */
  next: string;
  /** Exact redirect_uri sent to Google's authorization endpoint. */
  u: string;
  /** Creation timestamp in ms. */
  t: number;
};

function getGoogleOAuthCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = (env.GOOGLE_CLIENT_ID || env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)?.trim();
  const clientSecret = (
    env.GOOGLE_CLIENT_SECRET || env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET
  )?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function createGoogleOAuthState(payload: GoogleOAuthStatePayload, clientSecret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", clientSecret).update(encodedPayload).digest("base64url");
  return `${GOOGLE_OAUTH_STATE_PREFIX}${encodedPayload}.${signature}`;
}

function verifyGoogleOAuthState(state: string, clientSecret: string): GoogleOAuthStatePayload {
  if (!state.startsWith(GOOGLE_OAUTH_STATE_PREFIX)) {
    throw new AppError("UNAUTHENTICATED", "Invalid OAuth state.");
  }

  const remainder = state.slice(GOOGLE_OAUTH_STATE_PREFIX.length);
  const dotIndex = remainder.indexOf(".");
  if (dotIndex <= 0) {
    throw new AppError("UNAUTHENTICATED", "Malformed OAuth state.");
  }

  const encodedPayload = remainder.slice(0, dotIndex);
  const signature = remainder.slice(dotIndex + 1);
  const expectedSignature = createHmac("sha256", clientSecret)
    .update(encodedPayload)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new AppError("UNAUTHENTICATED", "Invalid OAuth state signature.");
  }

  let parsed: GoogleOAuthStatePayload;
  try {
    parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as GoogleOAuthStatePayload;
  } catch {
    throw new AppError("UNAUTHENTICATED", "Invalid OAuth state payload.");
  }

  if (
    typeof parsed.n !== "string" ||
    typeof parsed.next !== "string" ||
    typeof parsed.u !== "string" ||
    typeof parsed.t !== "number" ||
    Date.now() - parsed.t > GOOGLE_OAUTH_STATE_MAX_AGE_MS
  ) {
    throw new AppError("UNAUTHENTICATED", "Expired or invalid OAuth state.");
  }

  return parsed;
}

/** Generates the OAuth authorization URL for Google or Facebook sign-in. */
export async function getOAuthSignInUrl(
  provider: OAuthProvider,
  next = DEFAULT_AUTH_REDIRECT,
  origin?: string,
): Promise<string> {
  await assertOAuthProviderEnabled(provider);

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_AUTH_REDIRECT;
  const baseUrl = await resolveAuthBaseUrl(origin);

  // When Google OAuth credentials are configured on the server, redirect directly
  // to Google with our own /auth/callback URI so Google displays "continue to BooKanto"
  // instead of "<project-ref>.supabase.co".
  if (provider === "google") {
    const googleCreds = getGoogleOAuthCredentials();
    if (googleCreds) {
      const redirectUri = `${baseUrl}/auth/callback`;
      const rawNonce = randomBytes(16).toString("hex");
      const hashedNonce = createHash("sha256").update(rawNonce).digest("hex");
      const state = createGoogleOAuthState(
        {
          n: rawNonce,
          next: safeNext,
          u: redirectUri,
          t: Date.now(),
        },
        googleCreds.clientSecret,
      );

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", googleCreds.clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "select_account");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", hashedNonce);
      return authUrl.toString();
    }
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      ...(provider === "google"
        ? {
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          }
        : {}),
    },
  });

  if (error) throw toAppError(error);
  if (!data.url) throw new AppError("INTERNAL");
  return data.url;
}

/** Exchanges an OAuth or magic link code for a verified Supabase session. */
export async function exchangeAuthCode(
  code: string,
  state?: string,
): Promise<{ authId: string; next?: string }> {
  const supabase = await createSupabaseServerClient();

  if (state?.startsWith(GOOGLE_OAUTH_STATE_PREFIX)) {
    const googleCreds = getGoogleOAuthCredentials();
    if (!googleCreds) {
      throw new AppError("INTERNAL", "Google OAuth credentials are not configured.");
    }

    const verifiedState = verifyGoogleOAuthState(state, googleCreds.clientSecret);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: googleCreds.clientId,
        client_secret: googleCreds.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: verifiedState.u,
      }),
      cache: "no-store",
    });

    const tokenData = (await tokenResponse.json()) as {
      id_token?: string;
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenData.id_token) {
      throw new AppError(
        "UNAUTHENTICATED",
        tokenData.error_description || "Unable to verify Google account. Please try again.",
      );
    }

    let { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokenData.id_token,
      nonce: verifiedState.n,
      ...(tokenData.access_token ? { access_token: tokenData.access_token } : {}),
    });

    if (error && error.message.toLowerCase().includes("nonce")) {
      ({ data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: tokenData.id_token,
        ...(tokenData.access_token ? { access_token: tokenData.access_token } : {}),
      }));
    }

    if (error) throw toAppError(error);
    if (!data.user) throw new AppError("INTERNAL");

    const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
    const metaName = (metadata?.full_name ?? metadata?.name ?? metadata?.user_name) as
      string | undefined;
    await syncAuthUser({
      authId: data.user.id,
      email: data.user.email ?? null,
      phone: data.user.phone ?? null,
      name: metaName ?? null,
    });

    return { authId: data.user.id, next: verifiedState.next };
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw toAppError(error);
  if (!data.user) throw new AppError("INTERNAL");
  const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
  const metaName = (metadata?.full_name ?? metadata?.name ?? metadata?.user_name) as
    string | undefined;
  await syncAuthUser({
    authId: data.user.id,
    email: data.user.email ?? null,
    phone: data.user.phone ?? null,
    name: metaName ?? null,
  });
  return { authId: data.user.id };
}

/** Ends this session, or every session of the user with scope "global". */
export async function signOut(scope: "local" | "global" = "local"): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw toAppError(error);
}

/** Signs in with an email and password and syncs the local user record. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ authId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
  if (!data.user) throw new AppError("INTERNAL");
  const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
  const metaName = (metadata?.full_name ?? metadata?.name ?? metadata?.user_name) as
    string | undefined;
  await syncAuthUser({
    authId: data.user.id,
    email: data.user.email ?? email,
    phone: data.user.phone ?? null,
    name: metaName ?? null,
  });
  return { authId: data.user.id };
}

/**
 * Ensures the sample store owner and sample customer accounts exist in both
 * Supabase Auth (auth.users / auth.identities) and the public schema.
 */
export async function ensureSampleAccountsProvisioned(): Promise<void> {
  await db.transaction(async (tx) => {
    // Never create the sample super admin (public password) in production.
    const accounts =
      env.NODE_ENV === "production"
        ? [SAMPLE_ACCOUNTS.store, SAMPLE_ACCOUNTS.customer]
        : [SAMPLE_ACCOUNTS.store, SAMPLE_ACCOUNTS.customer, SAMPLE_ACCOUNTS.admin];
    for (const account of accounts) {
      await tx.execute(sql`
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          email_change_token_current,
          recovery_token,
          reauthentication_token,
          phone_change,
          phone_change_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          ${account.authId}::uuid,
          'authenticated',
          'authenticated',
          ${account.email},
          extensions.crypt(${account.password}, extensions.gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object(
            'sub', ${account.authId}::text,
            'email', ${account.email}::text,
            'full_name', ${account.name}::text,
            'email_verified', true,
            'phone_verified', false
          ),
          false,
          now(),
          now(),
          '', '', '', '', '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          updated_at = now()
      `);

      await tx.execute(sql`
        INSERT INTO auth.identities (
          id,
          user_id,
          provider_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${account.authId}::uuid,
          ${account.authId}::text,
          jsonb_build_object(
            'sub', ${account.authId}::text,
            'email', ${account.email}::text,
            'full_name', ${account.name}::text,
            'email_verified', true,
            'phone_verified', false
          ),
          'email',
          now(),
          now(),
          now()
        )
        ON CONFLICT (provider_id, provider) DO UPDATE SET
          identity_data = EXCLUDED.identity_data,
          updated_at = now()
      `);
    }

    // 1. Upsert Sample Store Owner in public.users
    const storeAcc = SAMPLE_ACCOUNTS.store;
    const [existingStoreUser] = await tx
      .select()
      .from(users)
      .where(
        or(
          eq(users.authId, storeAcc.authId),
          eq(users.authId, "seed:owner-1"),
          eq(users.phone, storeAcc.phone),
          eq(users.email, storeAcc.email),
        ),
      )
      .limit(1);

    let storeUserId: string;
    if (existingStoreUser) {
      await tx
        .update(users)
        .set({
          authId: storeAcc.authId,
          email: storeAcc.email,
          name: storeAcc.name,
          phone: storeAcc.phone,
          status: "active",
          deletedAt: null,
        })
        .where(eq(users.id, existingStoreUser.id));
      storeUserId = existingStoreUser.id;
    } else {
      const [created] = await tx
        .insert(users)
        .values({
          authId: storeAcc.authId,
          email: storeAcc.email,
          name: storeAcc.name,
          phone: storeAcc.phone,
          platformRole: "customer",
          status: "active",
        })
        .returning({ id: users.id });
      storeUserId = created!.id;
    }

    // Ensure sample shop exists and is owned by storeUserId
    const [existingShop] = await tx
      .select()
      .from(shops)
      .where(or(eq(shops.slug, "kuya-juns-barbershop-marikina"), eq(shops.ownerId, storeUserId)))
      .limit(1);

    let shopId: string;
    if (existingShop) {
      await tx
        .update(shops)
        .set({ ownerId: storeUserId, status: "active" })
        .where(eq(shops.id, existingShop.id));
      shopId = existingShop.id;
    } else {
      const [marikina] = await tx
        .insert(cities)
        .values({
          slug: "marikina",
          name: "Marikina",
          province: "Metro Manila",
          center: { lat: 14.6507, lng: 121.1029 },
          isActive: true,
        })
        .onConflictDoUpdate({
          target: cities.slug,
          set: { isActive: true },
        })
        .returning({ id: cities.id });

      const [concepcion] = await tx
        .insert(barangays)
        .values({
          cityId: marikina!.id,
          slug: "concepcion-uno",
          name: "Concepcion Uno",
          center: { lat: 14.6498, lng: 121.1112 },
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [barangays.cityId, barangays.slug],
          set: { isActive: true },
        })
        .returning({ id: barangays.id });

      const [barbershopCategory] = await tx
        .insert(categories)
        .values({
          slug: "barbershop",
          name: "Barbershop",
          icon: "scissors",
          defaultBookingType: "slot",
          sortOrder: 0,
          active: true,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: { active: true },
        })
        .returning({ id: categories.id });

      const [createdShop] = await tx
        .insert(shops)
        .values({
          ownerId: storeUserId,
          slug: "kuya-juns-barbershop-marikina",
          name: storeAcc.shopName,
          description: "Trusted neighborhood barbershop in Concepcion Uno, Marikina.",
          address: "88 Bayan-Bayanan Ave., Concepcion Uno, Marikina",
          cityId: marikina!.id,
          barangayId: concepcion!.id,
          location: { lat: 14.6498, lng: 121.1112 },
          phone: "+639190000001",
          status: "active",
          verifiedAt: new Date(),
        })
        .returning({ id: shops.id });
      shopId = createdShop!.id;

      await tx
        .insert(shopCategories)
        .values({ shopId, categoryId: barbershopCategory!.id })
        .onConflictDoNothing();

      await tx.insert(services).values([
        {
          shopId,
          categoryId: barbershopCategory!.id,
          name: "Haircut",
          priceType: "fixed",
          priceCentavos: 15000,
          durationMin: 30,
          bookingType: "slot",
          sortOrder: 0,
        },
        {
          shopId,
          categoryId: barbershopCategory!.id,
          name: "Haircut and shave",
          priceType: "fixed",
          priceCentavos: 22000,
          durationMin: 45,
          bookingType: "slot",
          sortOrder: 1,
        },
        {
          shopId,
          categoryId: barbershopCategory!.id,
          name: "Kids haircut",
          priceType: "fixed",
          priceCentavos: 12000,
          durationMin: 30,
          bookingType: "slot",
          sortOrder: 2,
        },
      ]);

      for (let weekday = 0; weekday <= 6; weekday++) {
        await tx
          .insert(businessHours)
          .values({
            shopId,
            weekday,
            opens: weekday === 0 ? "10:00" : "09:00",
            closes: weekday === 0 ? "17:00" : "19:00",
          })
          .onConflictDoNothing();
      }
    }

    await tx
      .insert(shopMembers)
      .values({
        shopId,
        userId: storeUserId,
        role: "owner",
        active: true,
      })
      .onConflictDoUpdate({
        target: [shopMembers.shopId, shopMembers.userId],
        set: { role: "owner", active: true },
      });

    // 2. Upsert Sample Customer in public.users
    const customerAcc = SAMPLE_ACCOUNTS.customer;
    const [existingCustomer] = await tx
      .select()
      .from(users)
      .where(
        or(
          eq(users.authId, customerAcc.authId),
          eq(users.authId, "seed:customer-1"),
          eq(users.phone, customerAcc.phone),
          eq(users.email, customerAcc.email),
        ),
      )
      .limit(1);

    let customerUserId: string;
    if (existingCustomer) {
      await tx
        .update(users)
        .set({
          authId: customerAcc.authId,
          email: customerAcc.email,
          name: customerAcc.name,
          phone: customerAcc.phone,
          status: "active",
          deletedAt: null,
        })
        .where(eq(users.id, existingCustomer.id));
      customerUserId = existingCustomer.id;
    } else {
      const [created] = await tx
        .insert(users)
        .values({
          authId: customerAcc.authId,
          email: customerAcc.email,
          name: customerAcc.name,
          phone: customerAcc.phone,
          platformRole: "customer",
          status: "active",
        })
        .returning({ id: users.id });
      customerUserId = created!.id;
    }

    // Ensure sample customer has a default saved address
    const [existingAddr] = await tx
      .select({ id: userAddresses.id })
      .from(userAddresses)
      .where(eq(userAddresses.userId, customerUserId))
      .limit(1);

    if (!existingAddr) {
      const [marikinaCity] = await tx
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.slug, "marikina"))
        .limit(1);
      const [concepcionBrgy] = marikinaCity
        ? await tx
            .select({ id: barangays.id })
            .from(barangays)
            .where(and(eq(barangays.cityId, marikinaCity.id), eq(barangays.slug, "concepcion-uno")))
            .limit(1)
        : [undefined];

      await tx.insert(userAddresses).values({
        userId: customerUserId,
        label: "Home",
        recipientName: customerAcc.name,
        phone: customerAcc.phone,
        streetAddress: "42 Rizal St., Concepcion Uno, Marikina",
        cityId: marikinaCity?.id ?? null,
        barangayId: concepcionBrgy?.id ?? null,
        notes: "Green gate near the bakery",
        location: { lat: 14.6498, lng: 121.1112 },
        isDefault: true,
      });
    }

    if (env.NODE_ENV === "production") return;

    // 3. Upsert Sample Super Admin in public.users (development and tests only)
    const adminAcc = SAMPLE_ACCOUNTS.admin;
    const [existingAdmin] = await tx
      .select()
      .from(users)
      .where(
        or(
          eq(users.authId, adminAcc.authId),
          eq(users.email, adminAcc.email),
          eq(users.phone, adminAcc.phone),
        ),
      )
      .limit(1);

    if (existingAdmin) {
      await tx
        .update(users)
        .set({
          authId: adminAcc.authId,
          email: adminAcc.email,
          name: adminAcc.name,
          phone: adminAcc.phone,
          platformRole: "super_admin",
          status: "active",
          deletedAt: null,
        })
        .where(eq(users.id, existingAdmin.id));
    } else {
      await tx.insert(users).values({
        authId: adminAcc.authId,
        email: adminAcc.email,
        name: adminAcc.name,
        phone: adminAcc.phone,
        platformRole: "super_admin",
        status: "active",
      });
    }
  });
}

/** Signs in using one of the pre-configured sample accounts (store or customer). */
export async function signInDemoAccount(
  role: SampleAccountRole,
): Promise<{ authId: string; defaultNext: string }> {
  // The sample admin is a super admin with a password in the source code.
  if (role === "admin" && env.NODE_ENV === "production") {
    throw new AppError("FORBIDDEN");
  }
  const account = SAMPLE_ACCOUNTS[role];
  await ensureSampleAccountsProvisioned();
  const { authId } = await signInWithPassword(account.email, account.password);
  return { authId, defaultNext: account.defaultNext };
}

/** Turns a Supabase Auth error into the message the person sees. Exported for tests. */
export function toAppError(error: Pick<AuthError, "status" | "code" | "message">): AppError {
  if (error.status === 429) return rateLimitError(error);
  const msg = error.message.toLowerCase();
  if (error.code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return new AppError(
      "VALIDATION",
      "Invalid email or password. Please check your credentials and try again.",
    );
  }
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

/**
 * Supabase answers 429 for three different limits. Each gets its own message,
 * because "too many tries" reads as the person's fault when it usually isn't.
 */
function rateLimitError(error: Pick<AuthError, "code" | "message">): AppError {
  // One address asked again within the cooldown (60 seconds by default).
  const wait = /after (\d+) seconds?/i.exec(error.message)?.[1];
  if (wait) {
    return new AppError(
      "RATE_LIMITED",
      `We just sent you a code. Wait ${wait} seconds before asking for a new one.`,
    );
  }
  // The project's hourly cap on auth emails, shared by everyone signing in.
  if (error.code === "over_email_send_rate_limit") {
    console.warn(
      "Supabase Auth hit its hourly email cap (over_email_send_rate_limit). Raise it under " +
        "Authentication > Rate Limits; the built-in mailer allows only 2 an hour, so set custom SMTP.",
    );
    return new AppError(
      "RATE_LIMITED",
      "We've sent too many sign-in emails this hour. Try again later, or sign in with your password or Google.",
    );
  }
  return new AppError("RATE_LIMITED");
}

// ---------------------------------------------------------------------------
// Two-factor login (TOTP) for the admin console. The plan requires it for
// /admin; middleware sends admins without it to /auth/two-factor.

export type TwoFactorStatus = {
  /** "aal2" once this session has passed a second factor ("aal1" before). */
  level: string | null;
  /** The verified authenticator, if the account has one. */
  factorId: string | null;
};

/** Whether this session passed a second factor, and the account's authenticator. */
export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const supabase = await createSupabaseServerClient();
  const [{ data: aal }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  return {
    level: aal?.currentLevel ?? null,
    factorId: factors?.totp[0]?.id ?? null,
  };
}

/**
 * Whether the current session may use admin tools: it passed a second factor,
 * or this is local development (where middleware skips the check too).
 */
export async function hasAdminSecondFactor(): Promise<boolean> {
  if (env.NODE_ENV === "development") return true;
  return (await getTwoFactorStatus()).level === "aal2";
}

/**
 * Starts adding an authenticator app: returns a QR code (SVG data URL) and the
 * secret to type in by hand. Unfinished earlier attempts are removed first.
 */
export async function startTotpEnrollment(): Promise<{
  factorId: string;
  qrCode: string;
  secret: string;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "BooKanto",
    friendlyName: `BooKanto admin ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data) {
    console.error("TOTP enrollment failed:", error?.message);
    throw new AppError("INTERNAL", "We couldn't start two-factor setup. Please try again.");
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/**
 * Checks a 6-digit authenticator code. On success the session is upgraded to
 * aal2 (and a new authenticator becomes verified).
 */
export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (!error) return;
  if (error.status === 429) throw new AppError("RATE_LIMITED");
  throw new AppError(
    "VALIDATION",
    "That code didn't work. Check your authenticator app and try again.",
    {
      code: ["That code didn't work."],
    },
  );
}

// ---------------------------------------------------------------------------
// Password reset (features/auth). The app checks the reset link itself; these
// change the password and end old sessions through the auth provider.

/** Sets a new password for an account. Call only after a reset link was claimed. */
export async function setUserPassword(authId: string, password: string): Promise<void> {
  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(authId, {
    password,
  });
  if (!error) return;
  if (error.code === "weak_password" || /password/i.test(error.message)) {
    throw new AppError("VALIDATION", "Choose a stronger password.", {
      password: ["Choose a stronger password."],
    });
  }
  console.error("Password update failed:", error.message);
  throw new AppError("INTERNAL", "We couldn't change your password. Please try again.");
}

/** Signs the account out on every device (after a password reset). */
export async function signOutEverywhere(authId: string): Promise<void> {
  await db.execute(sql`delete from auth.sessions where user_id = ${authId}::uuid`);
}
