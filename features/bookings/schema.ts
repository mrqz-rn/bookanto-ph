import { z } from "zod";

import { normalizePhone, isValidPhilippinePhone } from "@/lib/phone";

export const optionalPhilippinePhoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val ? normalizePhone(val) : null))
  .refine((val) => val === null || isValidPhilippinePhone(val), {
    message: "Enter a valid Philippine phone number (e.g. 0917 123 4567).",
  });

export const acceptBookingSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
  staffId: z.string().uuid("Invalid staff ID.").optional().nullable(),
});

export const declineBookingSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
  reason: z
    .string()
    .trim()
    .min(2, "Please provide a reason for declining.")
    .max(500, "Reason is too long (max 500 characters)."),
});

export const completeBookingSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
});

export const markNoShowSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
});

export const cancelBookingSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
  reason: z
    .string()
    .trim()
    .min(2, "Please provide a cancellation reason.")
    .max(500, "Reason is too long (max 500 characters)."),
});

export const assignStaffSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
  staffId: z.string().uuid("Invalid staff ID."),
});

export const addWalkInSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  serviceId: z.string().uuid("Invalid service ID."),
  staffId: z.string().uuid("Invalid staff ID.").optional().nullable(),
  customerName: z.string().trim().max(100, "Customer name is too long.").optional().nullable(),
  customerPhone: optionalPhilippinePhoneSchema,
  startAt: z.string().datetime({ message: "Invalid start date and time." }),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters.").optional().nullable(),
  priceCentavos: z
    .number()
    .int("Price must be an integer in centavos.")
    .min(0, "Price cannot be negative.")
    .optional()
    .nullable(),
  status: z.enum(["confirmed", "completed"]).default("confirmed"),
});

export const bookingFilterSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  status: z.string().optional(),
  staffId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().trim().optional(),
});
