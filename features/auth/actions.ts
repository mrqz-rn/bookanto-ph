"use server";

import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import {
  getOAuthSignInUrl,
  getTwoFactorStatus,
  requireUser,
  sendEmailOtp,
  sendOtp,
  signInDemoAccount,
  signInWithPassword,
  signOut,
  startTotpEnrollment,
  verifyEmailOtp,
  verifyOtp,
  verifyTotpCode,
} from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { hitRateLimit } from "@/lib/rate-limit";

import {
  DEFAULT_AUTH_REDIRECT,
  PHONE_AUTH_DISABLED_MESSAGE,
  PHONE_AUTH_ENABLED,
} from "./constants";
import {
  demoSignInSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  emailPasswordSignInSchema,
  oauthSignInSchema,
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
