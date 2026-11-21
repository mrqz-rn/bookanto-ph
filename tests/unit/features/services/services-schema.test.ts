import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  createMembershipSchema,
  createPackageSchema,
  createServiceAddonSchema,
  createServiceSchema,
} from "@/features/services/schema";

describe("services schemas", () => {
  const shopId = randomUUID();
  const serviceId = randomUUID();

  describe("createServiceSchema", () => {
    it("accepts valid fixed price service", () => {
      const result = createServiceSchema.safeParse({
        shopId,
        name: "Haircut and Wash",
        priceType: "fixed",
        priceCentavos: 15000,
        durationMin: 30,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 5,
        active: true,
      });

      expect(result.success).toBe(true);
    });

    it("accepts quote price without upfront priceCentavos", () => {
      const result = createServiceSchema.safeParse({
        shopId,
        name: "Custom Engine Diagnostic",
        priceType: "quote",
        priceCentavos: null,
        durationMin: 60,
        bookingType: "quote",
        capacity: 1,
        bufferMin: 15,
        active: true,
      });

      expect(result.success).toBe(true);
    });

    it("rejects fixed price when priceCentavos is missing", () => {
      const result = createServiceSchema.safeParse({
        shopId,
        name: "Haircut",
        priceType: "fixed",
        durationMin: 30,
        bookingType: "slot",
      });

      expect(result.success).toBe(false);
    });

    it("rejects non-positive duration", () => {
      const result = createServiceSchema.safeParse({
        shopId,
        name: "Quick Trim",
        priceType: "fixed",
        priceCentavos: 10000,
        durationMin: 0,
        bookingType: "slot",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createServiceAddonSchema", () => {
    it("accepts valid add-on", () => {
      const result = createServiceAddonSchema.safeParse({
        serviceId,
        shopId,
        name: "Anti-Dandruff Shampoo",
        priceCentavos: 5000,
        durationMin: 5,
        active: true,
      });

      expect(result.success).toBe(true);
    });

    it("rejects negative add-on price", () => {
      const result = createServiceAddonSchema.safeParse({
        serviceId,
        shopId,
        name: "Scalp Massage",
        priceCentavos: -100,
        durationMin: 10,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createPackageSchema", () => {
    it("accepts valid bundled package", () => {
      const result = createPackageSchema.safeParse({
        shopId,
        name: "Deluxe Grooming Combo",
        description: "Haircut + Shave + Facial",
        priceCentavos: 45000,
        originalPriceCentavos: 60000,
        serviceItems: [
          { serviceId: randomUUID(), quantity: 1 },
          { serviceId: randomUUID(), quantity: 1 },
        ],
        active: true,
      });

      expect(result.success).toBe(true);
    });

    it("requires at least one service item in package", () => {
      const result = createPackageSchema.safeParse({
        shopId,
        name: "Empty Package",
        priceCentavos: 10000,
        serviceItems: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createMembershipSchema", () => {
    it("accepts monthly membership with unlimited credits", () => {
      const result = createMembershipSchema.safeParse({
        shopId,
        name: "Unlimited Cuts Monthly",
        priceCentavos: 120000,
        cadence: "monthly",
        validityDays: 30,
        active: true,
      });

      expect(result.success).toBe(true);
    });

    it("accepts sessions pack pass with session credits", () => {
      const result = createMembershipSchema.safeParse({
        shopId,
        name: "5-Haircut Pass",
        priceCentavos: 65000,
        cadence: "sessions_pack",
        sessionCredits: 5,
        validityDays: 180,
        active: true,
      });

      expect(result.success).toBe(true);
    });
  });
});
