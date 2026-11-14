import { z } from "zod";

import { isValidPhilippinePhone, normalizePhone } from "@/lib/phone";

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
  next: z.string().optional().default("/account"),
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
  next: z.string().optional().default("/account"),
});

export const oauthSignInSchema = z.strictObject({
  provider: z.enum(["google", "facebook"]),
  next: z.string().optional().default("/account"),
});
