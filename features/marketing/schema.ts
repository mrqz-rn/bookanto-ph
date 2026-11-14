import { z } from "zod";

import { INQUIRY_KINDS } from "@/lib/db/schema/enums";
import { isValidPhilippinePhone, normalizePhone } from "@/lib/phone";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((value) => value || null);

export const inquiryInput = z
  .strictObject({
    kind: z.enum(INQUIRY_KINDS, { error: "Choose who you are" }),
    name: z
      .string()
      .trim()
      .min(2, "Enter your name")
      .max(100, "Keep your name under 100 characters"),
    email: z
      .string()
      .trim()
      .max(200, "Keep this under 200 characters")
      .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email")
      .transform((value) => value.toLowerCase() || null),
    phone: z
      .string()
      .trim()
      .transform((value) => (value ? normalizePhone(value) : null))
      .refine(
        (value) => value === null || isValidPhilippinePhone(value),
        "Enter a Philippine mobile number, like 0917 123 4567",
      ),
    businessName: optionalText(150),
    city: optionalText(100),
    message: z
      .string()
      .trim()
      .min(10, "Tell us a little more (at least 10 characters)")
      .max(2000, "Keep your message under 2,000 characters"),
  })
  .refine((inquiry) => inquiry.email !== null || inquiry.phone !== null, {
    message: "Add an email or a mobile number so we can reply",
    path: ["email"],
  });

export type InquiryInput = z.output<typeof inquiryInput>;
export const INQUIRY_FIELDS = [
  "kind",
  "name",
  "email",
  "phone",
  "businessName",
  "city",
  "message",
] as const;
export type InquiryField = (typeof INQUIRY_FIELDS)[number];
