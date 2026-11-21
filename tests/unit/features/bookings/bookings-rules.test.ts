import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  amountDueOnline,
  canCustomerCancel,
  canCustomerReschedule,
  canShopAccept,
  canShopComplete,
  canShopMarkNoShow,
  DEFAULT_RULES,
  quoteExpiry,
  requestExpiry,
  shouldRefund,
  TRANSITIONS,
  type BookingRules,
} from "@/features/bookings/rules";
import { BOOKING_STATUSES, type BookingStatus, type BookingType } from "@/lib/db/schema/enums";

const HOUR = 3_600_000;
// 10:00 Manila on Monday, Dec 7, 2026 (vitest runs in Los Angeles time).
const NOW = new Date("2026-12-07T02:00:00Z");
const inHours = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const rules = (patch: Partial<BookingRules> = {}): BookingRules => ({ ...DEFAULT_RULES, ...patch });
type TestBooking = {
  status: BookingStatus;
  bookingType: BookingType;
  startAt: Date;
  rescheduleCount: number;
  expiresAt: Date | null;
};
const booking = (patch: Partial<TestBooking> = {}): TestBooking => ({
  status: "confirmed",
  bookingType: "slot",
  startAt: inHours(24),
  rescheduleCount: 0,
  expiresAt: null,
  ...patch,
});

describe("request expiry", () => {
  it("gives the shop 2 hours, or 30 minutes for a same-day booking", () => {
    expect(requestExpiry(NOW, inHours(48))).toEqual(inHours(2));
    expect(requestExpiry(NOW, inHours(5))).toEqual(inHours(0.5));
  });
  it("never runs past the start time", () => {
    expect(requestExpiry(NOW, inHours(0.25))).toEqual(inHours(0.25));
  });
  it("crosses midnight in Manila time, not the machine's", () => {
    // 23:00 Manila; a booking at 01:00 the next Manila day isn't same-day.
    const late = new Date("2026-12-07T15:00:00Z");
    const next = new Date("2026-12-07T17:00:00Z");
    expect(requestExpiry(late, next)).toEqual(next);
  });
  it("lets a quote stand for the shop's quote window, up to the start", () => {
    expect(quoteExpiry(NOW, inHours(72), rules({ quoteValidHours: 24 }))).toEqual(inHours(24));
    expect(quoteExpiry(NOW, inHours(6), rules({ quoteValidHours: 24 }))).toEqual(inHours(6));
  });
});

describe("customer cancel", () => {
  it("is free outside the window and late inside it", () => {
    expect(canCustomerCancel(booking(), rules({ cancelWindowHours: 2 }), NOW)).toEqual({
      allowed: true,
      late: false,
    });
    expect(canCustomerCancel(booking({ startAt: inHours(1) }), rules(), NOW)).toEqual({
      allowed: true,
      late: true,
    });
  });
  it("never counts withdrawing a request or a quote as late", () => {
    const soon = { startAt: inHours(0.5) };
    expect(canCustomerCancel(booking({ ...soon, status: "requested" }), rules(), NOW)).toEqual({
      allowed: true,
      late: false,
    });
    expect(canCustomerCancel(booking({ ...soon, status: "quoted" }), rules(), NOW)).toMatchObject({
      late: false,
    });
  });
  it("stops once the booking has started or closed", () => {
    expect(canCustomerCancel(booking({ startAt: inHours(-1) }), rules(), NOW).allowed).toBe(false);
    expect(canCustomerCancel(booking({ status: "completed" }), rules(), NOW).allowed).toBe(false);
  });
});

describe("customer reschedule", () => {
  it("allows a confirmed booking outside the window", () => {
    expect(canCustomerReschedule(booking(), rules(), NOW).allowed).toBe(true);
  });
  it("refuses inside the window, past the limit, or for quotes and queue numbers", () => {
    expect(canCustomerReschedule(booking({ startAt: inHours(1) }), rules(), NOW).allowed).toBe(
      false,
    );
    expect(
      canCustomerReschedule(booking({ rescheduleCount: 2 }), rules({ maxReschedules: 2 }), NOW)
        .allowed,
    ).toBe(false);
    expect(canCustomerReschedule(booking({ status: "quoted" }), rules(), NOW).allowed).toBe(false);
    expect(canCustomerReschedule(booking({ bookingType: "queue" }), rules(), NOW).allowed).toBe(
      false,
    );
  });
  it("lets a pending request move even close to its time", () => {
    const request = booking({ status: "requested", startAt: inHours(1) });
    expect(canCustomerReschedule(request, rules(), NOW).allowed).toBe(true);
  });
});

describe("shop actions", () => {
  it("accepts only live, non-quote requests", () => {
    const request = booking({ status: "requested", expiresAt: inHours(1) });
    expect(canShopAccept(request, NOW).allowed).toBe(true);
    expect(canShopAccept({ ...request, expiresAt: inHours(-0.1) }, NOW).allowed).toBe(false);
    expect(canShopAccept({ ...request, bookingType: "quote" }, NOW).allowed).toBe(false);
    expect(canShopAccept({ ...request, startAt: inHours(-1) }, NOW).allowed).toBe(false);
    // A queue number's start is when they joined, so that's fine.
    expect(
      canShopAccept({ ...request, bookingType: "queue", startAt: inHours(-0.2) }, NOW).allowed,
    ).toBe(true);
  });
  it("completes after the start, and marks a no-show from 15 minutes after", () => {
    expect(canShopComplete(booking({ startAt: inHours(0.1) }), NOW).allowed).toBe(false);
    expect(canShopComplete(booking({ startAt: inHours(-0.1) }), NOW).allowed).toBe(true);
    expect(
      canShopMarkNoShow(booking({ startAt: new Date(NOW.getTime() - 14 * 60_000) }), NOW).allowed,
    ).toBe(false);
    expect(
      canShopMarkNoShow(booking({ startAt: new Date(NOW.getTime() - 15 * 60_000) }), NOW).allowed,
    ).toBe(true);
  });
});

describe("online payment", () => {
  it("works out a deposit, the full price, or nothing", () => {
    expect(amountDueOnline(rules(), 50_000)).toBe(0);
    expect(amountDueOnline(rules({ paymentMode: "full" }), 50_000)).toBe(50_000);
    expect(
      amountDueOnline(
        rules({ paymentMode: "deposit", depositType: "percent", depositValue: 20 }),
        50_000,
      ),
    ).toBe(10_000);
    expect(
      amountDueOnline(
        rules({ paymentMode: "deposit", depositType: "fixed", depositValue: 30_000 }),
        50_000,
      ),
    ).toBe(30_000);
  });
  it("caps a deposit at the price and skips amounts under ₱20", () => {
    const fixed = rules({ paymentMode: "deposit", depositType: "fixed", depositValue: 90_000 });
    expect(amountDueOnline(fixed, 50_000)).toBe(50_000);
    const small = rules({ paymentMode: "deposit", depositType: "percent", depositValue: 10 });
    expect(amountDueOnline(small, 15_000)).toBe(0);
    expect(amountDueOnline(rules({ paymentMode: "full" }), null)).toBe(0);
  });
  it("refunds unless the customer cancelled late or didn't show", () => {
    expect(shouldRefund("declined", false)).toBe(true);
    expect(shouldRefund("expired", false)).toBe(true);
    expect(shouldRefund("cancelled", false)).toBe(true);
    expect(shouldRefund("cancelled", true)).toBe(false);
    expect(shouldRefund("no_show", false)).toBe(false);
    expect(shouldRefund("completed", false)).toBe(false);
  });
});

describe("lifecycle", () => {
  const migration = readFileSync(join(process.cwd(), "db/migrations/0011_bookings.sql"), "utf8");
  const body = migration.slice(migration.indexOf("FUNCTION public.change_booking_status"));
  const list = body.slice(body.indexOf("NOT IN ("), body.indexOf(") THEN"));
  const sqlPairs = [...list.matchAll(/\('(\w+)', '(\w+)'\)/g)].map(
    ([, from, to]) => `${from}>${to}`,
  );

  it("matches change_booking_status() in the database", () => {
    const tsPairs = BOOKING_STATUSES.flatMap((from) =>
      TRANSITIONS[from].map((to) => `${from}>${to}`),
    );
    expect(sqlPairs.sort()).toEqual(tsPairs.sort());
  });
  it("has no way out of a final status", () => {
    for (const status of ["declined", "expired", "cancelled", "completed", "no_show"] as const) {
      expect(TRANSITIONS[status]).toEqual([]);
    }
  });
});
