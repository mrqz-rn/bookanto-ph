"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { writeAudit } from "@/lib/audit";
import {
  getOAuthSignInUrl,
  getTwoFactorStatus,
  requireUser,
  sendEmailOtp,
  sendOtp,
  setUserPassword,
  signInDemoAccount,
  signInWithPassword,
  signOut,
  signOutEverywhere,
  startTotpEnrollment,
  verifyEmailOtp,
  verifyOtp,
  verifyTotpCode,
} from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { sendAccountEmail } from "@/lib/notify";
import { publicEnv } from "@/lib/public-env";
import { hitRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

import {
  DEFAULT_AUTH_REDIRECT,
  PASSWORD_RESET_TTL_MINUTES,
  PHONE_AUTH_DISABLED_MESSAGE,
  PHONE_AUTH_ENABLED,
} from "./constants";
import { passwordChangedEmail, passwordResetEmail } from "./emails";
import { hashResetToken } from "./queries";
import {
  demoSignInSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  emailPasswordSignInSchema,
  oauthSignInSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  twoFactorVerifySchema,
} from "./schema";

/** Requests a one-time SMS verification code to a Philippine mobile number. */
export async function requestPhoneOtp(input: unknown): Promise<ActionResult<{ phone: string }>> {
  return runAction(async () => {
    if (!PHONE_AUTH_ENABLED) throw new AppError("FORBIDDEN", PHONE_AUTH_DISABLED_MESSAGE);
    const { phone, captchaToken } = parseInput(phoneOtpRequestSchema, input);
    await sendOtp(phone, captchaToken);
    return { phone };
  });
}

/** Verifies the 6-digit SMS OTP and logs the user in. */
export async function verifyPhoneOtpAction(
  input: unknown,
): Promise<ActionResult<{ authId: string; next: string }>> {
  return runAction(async () => {
    if (!PHONE_AUTH_ENABLED) throw new AppError("FORBIDDEN", PHONE_AUTH_DISABLED_MESSAGE);
    const { phone, code, next } = parseInput(phoneOtpVerifySchema, input);
    const { authId } = await verifyOtp(phone, code);
    return { authId, next };
  });
}

/** Requests a one-time email verification code or magic link. */
export async function requestEmailOtp(input: unknown): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    const { email, captchaToken } = parseInput(emailOtpRequestSchema, input);
    await sendEmailOtp(email, captchaToken);
    return { email };
  });
}

/** Verifies the 6-digit email OTP and logs the user in. */
export async function verifyEmailOtpAction(
  input: unknown,
): Promise<ActionResult<{ authId: string; next: string }>> {
  return runAction(async () => {
    const { email, code, next } = parseInput(emailOtpVerifySchema, input);
    const { authId } = await verifyEmailOtp(email, code);
    return { authId, next };
  });
}

/** Retrieves the OAuth redirect URL for Google or Facebook sign-in. */
export async function getOAuthUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const { provider, next, origin } = parseInput(oauthSignInSchema, input);
    const url = origin
      ? await getOAuthSignInUrl(provider, next, origin)
      : await getOAuthSignInUrl(provider, next);
    return { url };
  });
}

/** Signs the user in with an email and password. */
export async function signInWithPasswordAction(
  input: unknown,
): Promise<ActionResult<{ authId: string; next: string }>> {
  return runAction(async () => {
    const { email, password, next } = parseInput(emailPasswordSignInSchema, input);
    const { authId } = await signInWithPassword(email, password);
    return { authId, next };
  });
}

/** Signs in using one of the pre-configured sample accounts (store or customer). */
export async function signInDemoAccountAction(
  input: unknown,
): Promise<ActionResult<{ authId: string; next: string }>> {
  return runAction(async () => {
    const { role, next } = parseInput(demoSignInSchema, input);
    const { authId, defaultNext } = await signInDemoAccount(role);
    const destination =
      next && next !== DEFAULT_AUTH_REDIRECT && next.startsWith("/") && !next.startsWith("//")
        ? next
        : defaultNext;
    return { authId, next: destination };
  });
}

/** Signs the user out of the current session and redirects to /login. */
export async function signOutAction(): Promise<void> {
  await signOut("local");
  redirect("/login");
}

/** Starts adding an authenticator app (TOTP) for the admin console. */
export async function startTwoFactorSetupAction(): Promise<
  ActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, "admin:two_factor.manage");
    if ((await getTwoFactorStatus()).factorId) {
      throw new AppError(
        "CONFLICT",
        "Two-factor is already set up. Enter the code from your authenticator app.",
      );
    }
    return startTotpEnrollment();
  });
}

/**
 * Checks a code from the authenticator app. The first success finishes setup;
 * every success upgrades the session so the admin console opens.
 */
export async function verifyTwoFactorAction(
  input: unknown,
): Promise<ActionResult<{ next: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { factorId, code, next } = parseInput(twoFactorVerifySchema, input);
    assertCan(user, "admin:two_factor.manage");

    // Plan: 5 tries, then wait 15 minutes.
    if (!(await hitRateLimit(`two-factor:${user.id}`, 5, 15 * 60))) {
      throw new AppError("RATE_LIMITED", "Too many tries. Wait 15 minutes, then try again.");
    }

    const wasSetUp = Boolean((await getTwoFactorStatus()).factorId);
    await verifyTotpCode(factorId, code);

    await writeAudit({
      actorId: user.id,
      action: wasSetUp ? "admin.signed_in" : "admin.two_factor_enabled",
      targetType: "user",
      targetId: user.id,
      data: { platformRole: user.platformRole },
    });

    return { next };
  });
}

const RESET_LINK_DEAD =
  "This reset link has expired or was already used. Request a new one from the sign-in page.";

/** Sends the email after the response, so a reply never reveals whether an account exists. */
function sendLater(to: string, email: { subject: string; html: string; text: string }) {
  after(async () => {
    const result = await sendAccountEmail({ to, ...email });
    if (!result.success) console.error("Account email failed:", result.messageId);
  });
}

/**
 * Emails a password reset link that works once, for 10 minutes. Answers the
 * same whether or not the address has an account.
 */
export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult<{ sent: true }>> {
  return runAction(async () => {
    // Guests use this, so there's no user or permission; rate limits instead.
    const { email } = parseInput(passwordResetRequestSchema, input);
    const ip = await getClientIp();
    const emailKey = createHash("sha256").update(email).digest("hex").slice(0, 32);
    const allowed =
      (await hitRateLimit(`password-reset:email:${emailKey}`, 3, 10 * 60)) &&
      (!ip || (await hitRateLimit(`password-reset:ip:${ip}`, 10, 60 * 60)));
    if (!allowed) {
      throw new AppError(
        "RATE_LIMITED",
        "Too many reset requests. Wait 10 minutes, then try again.",
      );
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${email}`,
          isNull(users.deletedAt),
          eq(users.status, "active"),
        ),
      )
      .limit(1);

    if (user?.email) {
      const token = randomBytes(32).toString("base64url");
      await db.transaction(async (tx) => {
        // A new link replaces any older unused one.
        await tx
          .delete(passwordResetTokens)
          .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
        await tx.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: sql`now() + make_interval(mins => ${PASSWORD_RESET_TTL_MINUTES})`,
        });
      });
      await writeAudit({
        actorId: user.id,
        action: "auth.password_reset_requested",
        targetType: "user",
        targetId: user.id,
        ip,
      });
      const link = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
      sendLater(user.email, passwordResetEmail({ name: user.name, link }));
    }

    return { sent: true };
  });
}

/**
 * Sets a new password from a reset link. The link is claimed in one update,
 * so it works once even if submitted twice; then every session is signed out.
 */
export async function resetPasswordAction(input: unknown): Promise<ActionResult<{ done: true }>> {
  return runAction(async () => {
    const { token, password } = parseInput(passwordResetSchema, input);

    const [claimed] = await db
      .update(passwordResetTokens)
      .set({ usedAt: sql`now()` })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashResetToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, sql`now()`),
        ),
      )
      .returning({ id: passwordResetTokens.id, userId: passwordResetTokens.userId });
    if (!claimed) throw new AppError("VALIDATION", RESET_LINK_DEAD);

    const [user] = await db
      .select({ id: users.id, authId: users.authId, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.id, claimed.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new AppError("VALIDATION", RESET_LINK_DEAD);

    try {
      await setUserPassword(user.authId, password);
    } catch (error) {
      // The password didn't change, so give the link back for another try.
      await db
        .update(passwordResetTokens)
        .set({ usedAt: null })
        .where(eq(passwordResetTokens.id, claimed.id));
      throw error;
    }

    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
    await signOutEverywhere(user.authId);
    await writeAudit({
      actorId: user.id,
      action: "auth.password_reset",
      targetType: "user",
      targetId: user.id,
      ip: await getClientIp(),
    });
    if (user.email) sendLater(user.email, passwordChangedEmail({ name: user.name }));

    return { done: true };
  });
}
