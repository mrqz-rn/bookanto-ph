import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  deleteAccountSchema,
  deleteSavedAddressSchema,
  savedAddressSchema,
  updateProfileSchema,
  updateSavedAddressSchema,
} from "@/features/account/schema";

describe("account schemas", () => {
  describe("updateProfileSchema", () => {
    it("accepts valid profile updates and normalizes phone", () => {
      const parsed = updateProfileSchema.parse({
        name: "Maria Santos",
        phone: "0917 123 4567",
      });
      expect(parsed.name).toBe("Maria Santos");
      expect(parsed.phone).toBe("+639171234567");
    });

    it("allows an empty phone as null", () => {
      const parsed = updateProfileSchema.parse({ name: "Maria Santos", phone: "" });
      expect(parsed.name).toBe("Maria Santos");
      expect(parsed.phone).toBeNull();
    });

    it("rejects an email change", () => {
      expect(() =>
        updateProfileSchema.parse({ name: "Maria Santos", email: "new@example.com" }),
      ).toThrow();
    });

    it("rejects empty name", () => {
      expect(() => updateProfileSchema.parse({ name: "   " })).toThrow();
    });

    it("rejects invalid phone numbers", () => {
      expect(() =>
        updateProfileSchema.parse({
          name: "Maria",
          phone: "091234",
        }),
      ).toThrow();
    });

    it("rejects unknown fields", () => {
      expect(() =>
        updateProfileSchema.parse({
          name: "Maria",
          platformRole: "admin",
        }),
      ).toThrow();
    });
  });

  describe("deleteAccountSchema", () => {
    it("accepts exactly 'DELETE'", () => {
      expect(deleteAccountSchema.parse({ confirmation: "DELETE" })).toEqual({
        confirmation: "DELETE",
      });
    });

    it("rejects any other confirmation text", () => {
      expect(() => deleteAccountSchema.parse({ confirmation: "delete" })).toThrow();
      expect(() => deleteAccountSchema.parse({ confirmation: "yes" })).toThrow();
    });
  });

  describe("savedAddressSchema", () => {
    it("accepts valid address data", () => {
      const cityId = randomUUID();
      const barangayId = randomUUID();
      const parsed = savedAddressSchema.parse({
        label: "Home",
        recipientName: "Maria Santos",
        phone: "09171234567",
        streetAddress: "123 Rizal St., San Roque",
        cityId,
        barangayId,
        notes: "Near yellow bakery",
        isDefault: true,
      });

      expect(parsed.label).toBe("Home");
      expect(parsed.streetAddress).toBe("123 Rizal St., San Roque");
      expect(parsed.phone).toBe("+639171234567");
      expect(parsed.isDefault).toBe(true);
    });

    it("rejects short or empty street address", () => {
      expect(() =>
        savedAddressSchema.parse({
          label: "Home",
          streetAddress: "ab",
        }),
      ).toThrow();
    });
  });

  describe("updateSavedAddressSchema", () => {
    it("requires a valid uuid id", () => {
      expect(() =>
        updateSavedAddressSchema.parse({
          id: "not-a-uuid",
          label: "Home",
          streetAddress: "123 Rizal St.",
        }),
      ).toThrow();
    });
  });

  describe("deleteSavedAddressSchema", () => {
    it("requires a valid uuid id", () => {
      const id = randomUUID();
      const valid = deleteSavedAddressSchema.parse({ id });
      expect(valid.id).toBe(id);
    });
  });
});
