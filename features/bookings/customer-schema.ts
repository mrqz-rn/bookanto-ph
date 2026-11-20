import { z } from "zod";

import { ADDRESS_MAX, MIN_ONLINE_PAYMENT_CENTAVOS, NOTES_MAX, REASON_MAX } from "./rules";

// Inputs for the customer side of booking (create, cancel, reschedule, quotes,
// payment) and the shop's booking rules. Shop-side inbox inputs are in schema.ts.

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => value || null);

const instant = z.iso.datetime({ offset: true, message: "Pick a time." });
/** Client-generated per attempt, so a double tap makes one booking. */
const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

export const createBookingSchema = z.strictObject({
  serviceId: z.uuid(),
  /** A start time from getOpenSlots, in UTC. */
  startAt: instant,
  staffId: z.uuid().nullish(),
  /** Home service only: where the service happens. */
  address: optionalText(ADDRESS_MAX, "Keep the address under 300 characters."),
  notes: optionalText(NOTES_MAX, "Keep notes under 500 characters."),
  idempotencyKey,
});

export const joinQueueSchema = z.strictObject({
  serviceId: z.uuid(),
  notes: optionalText(NOTES_MAX, "Keep notes under 500 characters."),
  idempotencyKey,
});

export const cancelMyBookingSchema = z.strictObject({
  bookingId: z.uuid(),
  reason: optionalText(REASON_MAX, "Keep the reason under 500 characters."),
});

export const rescheduleBookingSchema = z.strictObject({
  bookingId: z.uuid(),
  startAt: instant,
});

export const rescheduleSlotsSchema = z
  .strictObject({
    bookingId: z.uuid(),
    /** First Manila date to return (YYYY-MM-DD). Defaults to today if omitted. */
    date: z.iso.date().optional(),
    /** Compatibility alias for date. */
    fromDate: z.iso.date().optional(),
    /** Compatibility field if passed from date range pickers. */
    toDate: z.iso.date().optional(),
    days: z.number().int().min(1).max(14).default(14),
    staffId: z.uuid().nullish(),
  })
  .transform((data) => ({
    bookingId: data.bookingId,
    date: data.date ?? data.fromDate,
    days: data.days,
    staffId: data.staffId ?? null,
  }));

export const sendQuoteSchema = z.strictObject({
  bookingId: z.uuid(),
  priceCentavos: z
    .number()
    .int("Enter a whole centavo amount.")
    .min(100, "Enter a price of at least ₱1.")
    .max(100_000_000, "That price is too high."),
  note: optionalText(REASON_MAX, "Keep the note under 500 characters."),
});

export const bookingIdSchema = z.strictObject({ bookingId: z.uuid() });

export const setBookingRulesSchema = z
  .strictObject({
    shopId: z.uuid(),
    cancelWindowHours: z.number().int().min(0).max(168),
    maxReschedules: z.number().int().min(0).max(10),
    quoteValidHours: z.number().int().min(1).max(168),
    paymentMode: z.enum(["none", "deposit", "full"]),
    depositType: z.enum(["fixed", "percent"]),
    depositValue: z.number().int().min(0).max(100_000_000),
  })
  .superRefine((rules, ctx) => {
    if (rules.paymentMode !== "deposit") return;
    if (rules.depositType === "percent" && (rules.depositValue < 1 || rules.depositValue > 100)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a deposit between 1% and 100%.",
        path: ["depositValue"],
      });
    }
    if (rules.depositType === "fixed" && rules.depositValue < MIN_ONLINE_PAYMENT_CENTAVOS) {
      ctx.addIssue({
        code: "custom",
        message: "A fixed deposit must be at least ₱20.",
        path: ["depositValue"],
      });
    }
  });
