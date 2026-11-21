import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  acceptBookingSchema,
  addWalkInSchema,
  assignStaffSchema,
  cancelBookingSchema,
  completeBookingSchema,
  declineBookingSchema,
  markNoShowSchema,
} from "@/features/bookings/schema";

describe("bookings schemas", () => {
  const validUuid = randomUUID();
  const validIsoDate = "2026-11-14T10:00:00.000Z";

  describe("acceptBookingSchema", () => {
    it("validates valid booking ID without staff", () => {
      const res = acceptBookingSchema.safeParse({ bookingId: validUuid });
      expect(res.success).toBe(true);
    });

    it("validates valid booking ID with staffId", () => {
      const res = acceptBookingSchema.safeParse({ bookingId: validUuid, staffId: randomUUID() });
      expect(res.success).toBe(true);
    });

    it("rejects invalid booking ID", () => {
      const res = acceptBookingSchema.safeParse({ bookingId: "not-a-uuid" });
      expect(res.success).toBe(false);
    });
  });

  describe("declineBookingSchema", () => {
    it("validates valid decline reason", () => {
      const res = declineBookingSchema.safeParse({
        bookingId: validUuid,
        reason: "Shop is fully booked at this hour",
      });
      expect(res.success).toBe(true);
    });

    it("rejects empty reason", () => {
      const res = declineBookingSchema.safeParse({
        bookingId: validUuid,
        reason: "   ",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("completeBookingSchema", () => {
    it("validates uuid", () => {
      const res = completeBookingSchema.safeParse({ bookingId: validUuid });
      expect(res.success).toBe(true);
    });
  });

  describe("markNoShowSchema", () => {
    it("validates uuid", () => {
      const res = markNoShowSchema.safeParse({ bookingId: validUuid });
      expect(res.success).toBe(true);
    });
  });

  describe("cancelBookingSchema", () => {
    it("validates cancellation with reason", () => {
      const res = cancelBookingSchema.safeParse({
        bookingId: validUuid,
        reason: "Emergency power interruption",
      });
      expect(res.success).toBe(true);
    });

    it("rejects missing reason", () => {
      const res = cancelBookingSchema.safeParse({
        bookingId: validUuid,
        reason: "",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("assignStaffSchema", () => {
    it("validates bookingId and staffId", () => {
      const res = assignStaffSchema.safeParse({
        bookingId: validUuid,
        staffId: randomUUID(),
      });
      expect(res.success).toBe(true);
    });
  });

  describe("addWalkInSchema", () => {
    it("validates valid walk-in with all details", () => {
      const res = addWalkInSchema.safeParse({
        shopId: validUuid,
        serviceId: randomUUID(),
        staffId: randomUUID(),
        customerName: "Maria Santos",
        customerPhone: "09171234567",
        startAt: validIsoDate,
        notes: "Preferred short trim",
        priceCentavos: 25000,
        status: "confirmed",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.customerPhone).toBe("+639171234567");
      }
    });

    it("validates minimal walk-in without phone and name", () => {
      const res = addWalkInSchema.safeParse({
        shopId: validUuid,
        serviceId: randomUUID(),
        startAt: validIsoDate,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe("confirmed");
      }
    });

    it("rejects invalid phone number", () => {
      const res = addWalkInSchema.safeParse({
        shopId: validUuid,
        serviceId: randomUUID(),
        startAt: validIsoDate,
        customerPhone: "12345",
      });

      expect(res.success).toBe(false);
    });

    it("rejects invalid date", () => {
      const res = addWalkInSchema.safeParse({
        shopId: validUuid,
        serviceId: randomUUID(),
        startAt: "not-a-date",
      });

      expect(res.success).toBe(false);
    });
  });
});
