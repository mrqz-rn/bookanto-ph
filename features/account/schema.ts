import { z } from "zod";

import { isValidPhilippinePhone, normalizePhone } from "@/lib/phone";

export const updateProfileSchema = z.strictObject({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null))
    .transform((val) => (val ? normalizePhone(val) : null))
    .refine((val) => val === null || isValidPhilippinePhone(val), {
      message: "Please enter a valid Philippine mobile number (e.g. 0917 123 4567).",
    }),
});

export const deleteAccountSchema = z.strictObject({
  confirmation: z.literal("DELETE", {
    message: 'Please type "DELETE" exactly to confirm.',
  }),
});

export const savedAddressSchema = z.strictObject({
  label: z
    .string()
    .trim()
    .min(1, "Address label is required (e.g. Home, Work).")
    .max(50, "Label is too long."),
  recipientName: z
    .string()
    .trim()
    .max(100, "Name is too long.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null))
    .transform((val) => (val ? normalizePhone(val) : null))
    .refine((val) => val === null || isValidPhilippinePhone(val), {
      message: "Please enter a valid Philippine mobile number (e.g. 0917 123 4567).",
    }),
  streetAddress: z
    .string()
    .trim()
    .min(3, "Street address must be at least 3 characters.")
    .max(300, "Street address is too long."),
  cityId: z
    .string()
    .uuid("Please select a valid city.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  barangayId: z
    .string()
    .uuid("Please select a valid barangay.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  notes: z
    .string()
    .trim()
    .max(500, "Notes are too long.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  isDefault: z.boolean().default(false),
});

export const updateSavedAddressSchema = savedAddressSchema.extend({
  id: z.string().uuid("Invalid address ID."),
});

export const deleteSavedAddressSchema = z.strictObject({
  id: z.string().uuid("Invalid address ID."),
});

export const setDefaultAddressSchema = z.strictObject({
  id: z.string().uuid("Invalid address ID."),
});
