import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptQuote,
  cancelMyBooking,
  createBooking,
  getRescheduleSlots,
  joinQueue,
  rescheduleBooking,
  setBookingRules,
  startPayment,
} from "@/features/bookings/customer-actions";
import {
  cancelMyBookingSchema,
  createBookingSchema,
  joinQueueSchema,
  rescheduleBookingSchema,
  rescheduleSlotsSchema,
  sendQuoteSchema,
  setBookingRulesSchema,
} from "@/features/bookings/customer-schema";
import * as authModule from "@/lib/auth";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("customer booking feature", () => {
  const customerId = randomUUID();
  const shopId = randomUUID();
  const serviceId = randomUUID();
  const bookingId = randomUUID();

  const mockCustomer: authModule.CurrentUser = {
    id: customerId,
    authId: "auth-cust-1",
    name: "Maria Santos",
    phone: "+639181234567",
    email: "maria@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [],
  };

  beforeEach(() => {
    vi.spyOn(authModule, "requireUser").mockResolvedValue(mockCustomer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("customer-schema validation", () => {
    it("validates createBookingSchema successfully", () => {
      const input = {
        serviceId: randomUUID(),
        startAt: "2026-11-20T10:00:00+08:00",
        notes: "First time customer",
        idempotencyKey: "abc123xyz789_-abcdef",
      };

      const parsed = createBookingSchema.parse(input);
      expect(parsed.serviceId).toBe(input.serviceId);
      expect(parsed.notes).toBe("First time customer");
    });

    it("rejects invalid idempotency keys", () => {
      expect(() =>
        createBookingSchema.parse({
          serviceId: randomUUID(),
          startAt: "2026-11-20T10:00:00Z",
          idempotencyKey: "short", // < 16 chars
        }),
      ).toThrow();
    });

    it("validates joinQueueSchema successfully", () => {
      const input = {
        serviceId: randomUUID(),
        idempotencyKey: "1234567890123456",
        notes: "Haircut and wash",
      };
      const parsed = joinQueueSchema.parse(input);
      expect(parsed.serviceId).toBe(input.serviceId);
      expect(parsed.notes).toBe("Haircut and wash");
    });

    it("validates cancelMyBookingSchema", () => {
      const parsed = cancelMyBookingSchema.parse({
        bookingId: randomUUID(),
        reason: "Emergency came up",
      });
      expect(parsed.reason).toBe("Emergency came up");
    });

    it("validates rescheduleBookingSchema", () => {
      const bId = randomUUID();
      const parsed = rescheduleBookingSchema.parse({
        bookingId: bId,
        startAt: "2026-11-22T14:30:00Z",
      });
      expect(parsed.bookingId).toBe(bId);
    });

    it("validates rescheduleSlotsSchema with standard inputs", () => {
      const bId = randomUUID();
      const parsed = rescheduleSlotsSchema.parse({
        bookingId: bId,
        date: "2026-12-01",
        days: 7,
      });
      expect(parsed).toEqual({
        bookingId: bId,
        date: "2026-12-01",
        days: 7,
        staffId: null,
      });
    });

    it("validates rescheduleSlotsSchema when date is omitted", () => {
      const bId = randomUUID();
      const parsed = rescheduleSlotsSchema.parse({
        bookingId: bId,
      });
      expect(parsed).toEqual({
        bookingId: bId,
        date: undefined,
        days: 14,
        staffId: null,
      });
    });

    it("validates rescheduleSlotsSchema with compat fields fromDate and toDate", () => {
      const bId = randomUUID();
      const sId = randomUUID();
      const parsed = rescheduleSlotsSchema.parse({
        bookingId: bId,
        fromDate: "2026-12-05",
        toDate: "2026-12-19",
        staffId: sId,
      });
      expect(parsed).toEqual({
        bookingId: bId,
        date: "2026-12-05",
        days: 14,
        staffId: sId,
      });
    });

    it("rejects rescheduleSlotsSchema with invalid date", () => {
      expect(() =>
        rescheduleSlotsSchema.parse({
          bookingId: randomUUID(),
          date: "not-a-date",
        }),
      ).toThrow();
    });

    it("validates sendQuoteSchema", () => {
      const bId = randomUUID();
      const parsed = sendQuoteSchema.parse({
        bookingId: bId,
        priceCentavos: 150000,
        note: "Includes parts and labor",
      });
      expect(parsed.priceCentavos).toBe(150000);
    });

    it("validates setBookingRulesSchema with percent deposit rules", () => {
      const parsed = setBookingRulesSchema.parse({
        shopId: randomUUID(),
        cancelWindowHours: 4,
        maxReschedules: 2,
        quoteValidHours: 48,
        paymentMode: "deposit",
        depositType: "percent",
        depositValue: 20, // 20%
      });
      expect(parsed.depositValue).toBe(20);
    });

    it("rejects deposit percentage outside 1-100%", () => {
      expect(() =>
        setBookingRulesSchema.parse({
          shopId: randomUUID(),
          cancelWindowHours: 4,
          maxReschedules: 2,
          quoteValidHours: 24,
          paymentMode: "deposit",
          depositType: "percent",
          depositValue: 150,
        }),
      ).toThrow();
    });

    it("rejects fixed deposit below minimum ₱20 (2000 centavos)", () => {
      expect(() =>
        setBookingRulesSchema.parse({
          shopId: randomUUID(),
          cancelWindowHours: 4,
          maxReschedules: 2,
          quoteValidHours: 24,
          paymentMode: "deposit",
          depositType: "fixed",
          depositValue: 1000, // ₱10
        }),
      ).toThrow();
    });
  });

  describe("customer actions authentication", () => {
    it("fails createBooking when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await createBooking({
        serviceId,
        startAt: "2026-11-20T10:00:00Z",
        idempotencyKey: "1234567890123456",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails joinQueue when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await joinQueue({
        serviceId,
        idempotencyKey: "1234567890123456",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails cancelMyBooking when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await cancelMyBooking({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails acceptQuote when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await acceptQuote({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails startPayment when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await startPayment({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails getRescheduleSlots when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await getRescheduleSlots({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails rescheduleBooking when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await rescheduleBooking({ bookingId, startAt: "2026-12-01T10:00:00Z" });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails setBookingRules when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await setBookingRules({
        shopId,
        cancelWindowHours: 2,
        maxReschedules: 2,
        quoteValidHours: 24,
        paymentMode: "none",
        depositType: "percent",
        depositValue: 0,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });
  });
});
