"use server";

import { redirect } from "next/navigation";

import {
  getOAuthSignInUrl,
  sendEmailOtp,
  sendOtp,
  signOut,
  verifyEmailOtp,
  verifyOtp,
} from "@/lib/auth";
import { parseInput, runAction, type ActionResult } from "@/lib/errors";

import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  oauthSignInSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
} from "./schema";

/** Requests a one-time SMS verification code to a Philippine mobile number. */
export async function requestPhoneOtp(input: unknown): Promise<ActionResult<{ phone: string }>> {
  return runAction(async () => {
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
    const { provider, next } = parseInput(oauthSignInSchema, input);
    const url = await getOAuthSignInUrl(provider, next);
    return { url };
  });
}

/** Signs the user out of the current session and redirects to /login. */
export async function signOutAction(): Promise<void> {
  await signOut("local");
  redirect("/login");
}
