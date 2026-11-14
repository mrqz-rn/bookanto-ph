import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  businessHourEntrySchema,
  createShopSchema,
  updateShopHoursSchema,
  updateShopLocationSchema,
} from "@/features/shops/schema";

describe("shops schemas", () => {
  const validCategory = randomUUID();

  describe("createShopSchema", () => {
    it("accepts valid shop details", () => {
      const result = createShopSchema.safeParse({
        name: "Kanto Barber Co.",
        slug: "kanto-barber-co",
        description: "Best fade in town",
        phone: "09171234567",
        categoryIds: [validCategory],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("+639171234567");
      }
    });

    it("rejects invalid slugs with uppercase or special characters", () => {
      const result = createShopSchema.safeParse({
        name: "Kanto Barber",
        slug: "Kanto Barber!",
        phone: "09171234567",
        categoryIds: [validCategory],
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid phone numbers", () => {
      const result = createShopSchema.safeParse({
        name: "Kanto Barber",
        slug: "kanto-barber",
        phone: "12345",
        categoryIds: [validCategory],
      });

      expect(result.success).toBe(false);
    });

    it("requires at least one category", () => {
      const result = createShopSchema.safeParse({
        name: "Kanto Barber",
        slug: "kanto-barber",
        phone: "09171234567",
        categoryIds: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("updateShopLocationSchema", () => {
    const shopId = randomUUID();

    it("accepts coordinates within the Philippines", () => {
      const result = updateShopLocationSchema.safeParse({
        shopId,
        address: "123 J.P. Rizal St., Concepcion Uno",
        cityId: randomUUID(),
        barangayId: randomUUID(),
        lat: 14.6507,
        lng: 121.1029,
      });

      expect(result.success).toBe(true);
    });

    it("rejects coordinates outside the Philippines", () => {
      const result = updateShopLocationSchema.safeParse({
        shopId,
        address: "Tokyo, Japan",
        lat: 35.6762,
        lng: 139.6503,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("businessHourEntrySchema", () => {
    it("accepts valid opening and closing hours", () => {
      const result = businessHourEntrySchema.safeParse({
        weekday: 1,
        opens: "09:00",
        closes: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      });

      expect(result.success).toBe(true);
    });

    it("rejects when closes is earlier than opens", () => {
      const result = businessHourEntrySchema.safeParse({
        weekday: 1,
        opens: "18:00",
        closes: "09:00",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid break time range", () => {
      const result = businessHourEntrySchema.safeParse({
        weekday: 1,
        opens: "09:00",
        closes: "18:00",
        breakStart: "14:00",
        breakEnd: "13:00",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("updateShopHoursSchema", () => {
    const shopId = randomUUID();

    it("accepts valid array of business hours", () => {
      const result = updateShopHoursSchema.safeParse({
        shopId,
        hours: [
          {
            weekday: 1,
            opens: "09:00",
            closes: "18:00",
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });
});
