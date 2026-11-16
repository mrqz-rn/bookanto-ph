// Booking rules as pure functions over plain values, so actions, pages and
// tests agree on them. Browser-safe. Instants are UTC; "same day" means the
// same Manila calendar date.

import type { BookingStatus, BookingType, DepositType, PaymentMode } from "@/lib/db/schema/enums";
import { manilaDate } from "@/lib/time";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A shop has this long to answer a request; 30 minutes when it's for today. */
export const REQUEST_EXPIRY_MIN = 120;
export const SAME_DAY_REQUEST_EXPIRY_MIN = 30;
/** Plan: 10 bookings a day per customer, and a cap on unanswered requests. */
export const MAX_BOOKINGS_PER_DAY = 10;
export const MAX_OPEN_REQUESTS = 5;
/** Below this the payment provider won't take a checkout (₱20). */
export const MIN_ONLINE_PAYMENT_CENTAVOS = 2000;
/** A started checkout can be reopened for this long before a new one is made. */
export const CHECKOUT_REUSE_MIN = 30;

export const NOTES_MAX = 500;
export const ADDRESS_MAX = 300;
export const REASON_MAX = 500;

export type BookingRules = {
  cancelWindowHours: number;
  maxReschedules: number;
  quoteValidHours: number;
  paymentMode: PaymentMode;
  depositType: DepositType;
  /** Centavos when fixed, whole percent when percent. */
  depositValue: number;
};

/** What a shop gets until it sets its own rules. */
export const DEFAULT_RULES: BookingRules = {
  cancelWindowHours: 2,
  maxReschedules: 2,
  quoteValidHours: 24,
  paymentMode: "none",
  depositType: "percent",
  depositValue: 0,
};

/** Statuses a booking never leaves. */
export const FINAL_STATUSES: readonly BookingStatus[] = [
  "declined",
  "expired",
  "cancelled",
  "completed",
  "no_show",
];

export const TYPE_LABELS: Record<BookingType, string> = {
  slot: "At the shop",
  home: "Home service",
  quote: "Quote first",
  queue: "Walk-in queue",
};

/**
 * When an unanswered request expires: 2 hours after it's made, 30 minutes for
 * a same-day booking, and never after the booking's start time.
 */
export function requestExpiry(now: Date, startAt: Date): Date {
  const sameDay = manilaDate(now) === manilaDate(startAt);
  const wait = (sameDay ? SAME_DAY_REQUEST_EXPIRY_MIN : REQUEST_EXPIRY_MIN) * MINUTE;
  return new Date(Math.max(now.getTime(), Math.min(now.getTime() + wait, startAt.getTime())));
}

/** When a quote sent now stops being acceptable. */
export function quoteExpiry(now: Date, startAt: Date, rules: BookingRules): Date {
  return new Date(Math.min(now.getTime() + rules.quoteValidHours * HOUR, startAt.getTime()));
}

type BookingState = {
  status: BookingStatus;
  bookingType: BookingType;
  startAt: Date;
  rescheduleCount: number;
};

export type Verdict = { allowed: true; late: boolean } | { allowed: false; reason: string };

const insideWindow = (booking: BookingState, rules: BookingRules, now: Date) =>
  booking.startAt.getTime() - now.getTime() < rules.cancelWindowHours * HOUR;

/**
 * Whether the customer may cancel. Requests and quotes can always be
 * withdrawn. A confirmed booking can be cancelled until it starts; inside the
 * shop's window it counts as a late cancellation and any deposit is kept.
 */
export function canCustomerCancel(booking: BookingState, rules: BookingRules, now: Date): Verdict {
  if (FINAL_STATUSES.includes(booking.status)) {
    return { allowed: false, reason: "This booking is already closed." };
  }
  if (booking.status !== "confirmed") return { allowed: true, late: false };
  if (booking.bookingType === "queue") return { allowed: true, late: false };
  if (now >= booking.startAt) {
    return { allowed: false, reason: "This booking has already started. Please message the shop." };
  }
  return { allowed: true, late: insideWindow(booking, rules, now) };
}

/**
 * Whether the customer may move the booking to another time. Not for quotes
 * (the price was for that time) or queue numbers, not inside the cancellation
 * window, and only as many times as the shop allows.
 */
export function canCustomerReschedule(
  booking: BookingState,
  rules: BookingRules,
  now: Date,
): Verdict {
  if (booking.status !== "requested" && booking.status !== "confirmed") {
    return { allowed: false, reason: "Only pending or confirmed bookings can be moved." };
  }
  if (booking.bookingType === "queue") {
    return { allowed: false, reason: "Queue numbers can't be moved. Cancel and join again." };
  }
  if (booking.rescheduleCount >= rules.maxReschedules) {
    return {
      allowed: false,
      reason:
        rules.maxReschedules === 0
          ? "This shop doesn't allow rescheduling. You can cancel and book again."
          : "You've reached this shop's limit for moving a booking.",
    };
  }
  if (now >= booking.startAt) {
    return { allowed: false, reason: "This booking has already started." };
  }
  if (booking.status === "confirmed" && insideWindow(booking, rules, now)) {
    return {
      allowed: false,
      reason: `It's too close to your booking to move it (less than ${hoursLabel(rules.cancelWindowHours)} away). Please message the shop.`,
    };
  }
  return { allowed: true, late: false };
}

export function hoursLabel(hours: number): string {
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * What the customer is asked to pay online for a booking priced at
 * `priceCentavos`: nothing, a deposit, or the full price. Amounts too small
 * for the payment provider are not collected.
 */
export function amountDueOnline(rules: BookingRules, priceCentavos: number | null): number {
  if (rules.paymentMode === "none" || !priceCentavos || priceCentavos <= 0) return 0;
  let due = priceCentavos;
  if (rules.paymentMode === "deposit") {
    due =
      rules.depositType === "fixed"
        ? rules.depositValue
        : Math.round((priceCentavos * rules.depositValue) / 100);
  }
  due = Math.min(due, priceCentavos);
  return due >= MIN_ONLINE_PAYMENT_CENTAVOS ? due : 0;
}

/**
 * Whether money paid online goes back to the customer once a booking ends
 * without the service: yes, unless the customer cancelled late or didn't show.
 */
export function shouldRefund(status: BookingStatus, lateCancel: boolean): boolean {
  if (status === "declined" || status === "expired") return true;
  return status === "cancelled" && !lateCancel;
}

/** The lifecycle: which status may follow which. change_booking_status() enforces the same list. */
export const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  requested: ["confirmed", "quoted", "declined", "expired", "cancelled"],
  quoted: ["confirmed", "expired", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  declined: [],
  expired: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

/** A shop can mark a no-show from this long after the start time. */
export const NO_SHOW_AFTER_MIN = 15;

type ShopSideState = {
  status: BookingStatus;
  bookingType: BookingType;
  startAt: Date;
  expiresAt: Date | null;
};

/** Whether the shop can accept a request now. The slot itself is re-checked separately. */
export function canShopAccept(booking: ShopSideState, now: Date): Verdict {
  if (booking.status !== "requested") {
    return { allowed: false, reason: "Only new requests can be accepted." };
  }
  if (booking.bookingType === "quote") {
    return { allowed: false, reason: "Send a quote for this request instead." };
  }
  if (booking.expiresAt && booking.expiresAt <= now) {
    return { allowed: false, reason: "This request has expired." };
  }
  if (booking.bookingType !== "queue" && booking.startAt <= now) {
    return { allowed: false, reason: "The requested time has already passed." };
  }
  return { allowed: true, late: false };
}

/** Completed only once the service has started. */
export function canShopComplete(booking: ShopSideState, now: Date): Verdict {
  if (booking.status !== "confirmed") {
    return { allowed: false, reason: "Only confirmed bookings can be completed." };
  }
  if (now < booking.startAt) {
    return { allowed: false, reason: "You can mark this done once its start time has passed." };
  }
  return { allowed: true, late: false };
}

/** A no-show from 15 minutes after the start time. */
export function canShopMarkNoShow(booking: ShopSideState, now: Date): Verdict {
  if (booking.status !== "confirmed") {
    return { allowed: false, reason: "Only confirmed bookings can be marked as no-show." };
  }
  if (now.getTime() < booking.startAt.getTime() + NO_SHOW_AFTER_MIN * 60_000) {
    return {
      allowed: false,
      reason: `You can mark a no-show from ${NO_SHOW_AFTER_MIN} minutes after the start time.`,
    };
  }
  return { allowed: true, late: false };
}
