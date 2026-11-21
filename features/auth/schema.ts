import { z } from "zod";

import {
  DEFAULT_AUTH_REDIRECT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/features/auth/constants";
import { isValidPhilippinePhone, normalizePhone } from "@/lib/phone";

/** Where to go after two-factor: a same-site path only. */
const safeNextPath = z
  .string()
  .optional()
  .transform((value) =>
    value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
      ? value
      : "/admin",
  );

export const twoFactorVerifySchema = z.strictObject({
  factorId: z.string().uuid("Start two-factor setup again."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
  next: safeNextPath,
});

export const passwordResetRequestSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
});

/** 32 random bytes, base64url: exactly what requestPasswordReset puts in the link. */
export const passwordResetTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "This reset link isn't valid. Request a new one.");

export const passwordResetSchema = z
  .strictObject({
    token: passwordResetTokenSchema,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The passwords don't match.",
    path: ["confirmPassword"],
  });

export const phoneOtpRequestSchema = z.strictObject({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .transform(normalizePhone)
    .refine(isValidPhilippinePhone, {
      message: "Please enter a valid Philippine mobile number (e.g. 0917 123 4567).",
    }),
  captchaToken: z.string().optional(),
});

export const phoneOtpVerifySchema = z.strictObject({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .transform(normalizePhone)
    .refine(isValidPhilippinePhone, {
      message: "Invalid phone number.",
    }),
  code: z
    .string()
    .trim()
    .length(6, "Verification code must be 6 digits.")
    .regex(/^\d{6}$/, "Code must contain numbers only."),
  next: z.string().optional().default(DEFAULT_AUTH_REDIRECT),
});

export const emailOtpRequestSchema = z.strictObject({
  email: z.string().trim().email("Please enter a valid email address."),
  captchaToken: z.string().optional(),
});

export const emailOtpVerifySchema = z.strictObject({
  email: z.string().trim().email("Invalid email address."),
  code: z
    .string()
    .trim()
    .length(6, "Verification code must be 6 digits.")
    .regex(/^\d{6}$/, "Code must contain numbers only."),
  next: z.string().optional().default(DEFAULT_AUTH_REDIRECT),
});

export const oauthSignInSchema = z.strictObject({
  provider: z.enum(["google", "facebook"]),
  next: z.string().optional().default(DEFAULT_AUTH_REDIRECT),
  origin: z.string().url().optional(),
});

export const emailPasswordSignInSchema = z.strictObject({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  next: z.string().optional().default(DEFAULT_AUTH_REDIRECT),
});

export const demoSignInSchema = z.strictObject({
  role: z.enum(["store", "customer", "admin"]),
  next: z.string().optional(),
});
