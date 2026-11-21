import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  createBookingDisputeSchema,
  createCustomFraudSignalSchema,
  deleteAnnouncementSchema,
  deleteCategorySchema,
  rejectShopSchema,
  resolveDisputeSchema,
  runFraudScanSchema,
  suspendShopSchema,
  suspendUserSchema,
  toggleAnnouncementActiveSchema,
  toggleCategoryActiveSchema,
  unsuspendShopSchema,
  unsuspendUserSchema,
  updateFraudSignalSchema,
  updateUserRoleSchema,
  upsertAnnouncementSchema,
  upsertCategorySchema,
  verifyShopSchema,
} from "@/features/admin/schema";

describe("admin schemas", () => {
  const validUuid = randomUUID();

  describe("verifyShopSchema", () => {
    it("accepts valid shopId", () => {
      const parsed = verifyShopSchema.parse({ shopId: validUuid });
      expect(parsed.shopId).toBe(validUuid);
    });

    it("rejects non-uuid shopId", () => {
      expect(() => verifyShopSchema.parse({ shopId: "12345" })).toThrow();
    });

    it("rejects unknown extra properties (strict mode)", () => {
      expect(() => verifyShopSchema.parse({ shopId: validUuid, extraField: true })).toThrow();
    });
  });

  describe("rejectShopSchema and suspendShopSchema", () => {
    it("accepts valid shopId and reason", () => {
      const parsed = rejectShopSchema.parse({
        shopId: validUuid,
        reason: "Permit expired",
      });
      expect(parsed.reason).toBe("Permit expired");
    });

    it("rejects empty reason", () => {
      expect(() => rejectShopSchema.parse({ shopId: validUuid, reason: "" })).toThrow();
    });

    it("accepts valid suspend shop payload", () => {
      const parsed = suspendShopSchema.parse({
        shopId: validUuid,
        reason: "Policy violation",
      });
      expect(parsed.shopId).toBe(validUuid);
    });

    it("accepts valid unsuspend shop payload", () => {
      const parsed = unsuspendShopSchema.parse({ shopId: validUuid });
      expect(parsed.shopId).toBe(validUuid);
    });
  });

  describe("upsertCategorySchema, toggleCategoryActiveSchema, and deleteCategorySchema", () => {
    it("accepts valid category creation payload", () => {
      const parsed = upsertCategorySchema.parse({
        name: "Auto Repair",
        slug: "auto-repair",
        icon: "wrench",
        defaultBookingType: "home",
        sortOrder: 2,
        active: true,
      });
      expect(parsed.name).toBe("Auto Repair");
      expect(parsed.defaultBookingType).toBe("home");
    });

    it("rejects invalid slugs with uppercase or special characters", () => {
      expect(() =>
        upsertCategorySchema.parse({
          name: "Auto Repair",
          slug: "Auto_Repair!",
          icon: "wrench",
          defaultBookingType: "slot",
        }),
      ).toThrow();
    });

    it("accepts toggle category active payload", () => {
      const parsed = toggleCategoryActiveSchema.parse({
        id: validUuid,
        active: false,
      });
      expect(parsed.active).toBe(false);
    });

    it("accepts delete category payload", () => {
      const parsed = deleteCategorySchema.parse({ id: validUuid });
      expect(parsed.id).toBe(validUuid);
    });
  });

  describe("suspendUserSchema, unsuspendUserSchema and updateUserRoleSchema", () => {
    it("accepts valid suspend user payload", () => {
      const parsed = suspendUserSchema.parse({
        userId: validUuid,
        reason: "Disruptive behavior",
      });
      expect(parsed.userId).toBe(validUuid);
    });

    it("accepts valid unsuspend user payload", () => {
      const parsed = unsuspendUserSchema.parse({ userId: validUuid });
      expect(parsed.userId).toBe(validUuid);
    });

    it("accepts valid platform role update", () => {
      const parsed = updateUserRoleSchema.parse({
        userId: validUuid,
        role: "admin",
      });
      expect(parsed.role).toBe("admin");
    });

    it("rejects invalid platform role", () => {
      expect(() =>
        updateUserRoleSchema.parse({
          userId: validUuid,
          role: "super_hero",
        }),
      ).toThrow();
    });
  });

  describe("resolveDisputeSchema and createBookingDisputeSchema", () => {
    it("accepts valid dispute creation", () => {
      const parsed = createBookingDisputeSchema.parse({
        bookingId: validUuid,
        reason: "Customer did not receive service",
      });
      expect(parsed.bookingId).toBe(validUuid);
    });

    it("accepts valid dispute resolution", () => {
      const parsed = resolveDisputeSchema.parse({
        reportId: validUuid,
        status: "resolved",
        resolution: "Customer was refunded after consultation with shop owner.",
        hideAssociatedReview: true,
      });
      expect(parsed.status).toBe("resolved");
      expect(parsed.hideAssociatedReview).toBe(true);
    });

    it("rejects invalid resolution status", () => {
      expect(() =>
        resolveDisputeSchema.parse({
          reportId: validUuid,
          status: "pending",
          resolution: "Still looking",
        }),
      ).toThrow();
    });
  });

  describe("upsertAnnouncementSchema, toggleAnnouncementActiveSchema, deleteAnnouncementSchema", () => {
    it("accepts valid announcement with audience and dates", () => {
      const parsed = upsertAnnouncementSchema.parse({
        title: "System Update",
        message: "Maintenance on Sunday 2 AM",
        kind: "maintenance",
        targetAudience: "all",
        actionUrl: "https://bookanto.ph/status",
        actionLabel: "Check Status",
        isActive: true,
      });
      expect(parsed.kind).toBe("maintenance");
      expect(parsed.targetAudience).toBe("all");
    });

    it("accepts toggle announcement active payload", () => {
      const parsed = toggleAnnouncementActiveSchema.parse({
        id: validUuid,
        isActive: false,
      });
      expect(parsed.isActive).toBe(false);
    });

    it("accepts delete announcement payload", () => {
      const parsed = deleteAnnouncementSchema.parse({ id: validUuid });
      expect(parsed.id).toBe(validUuid);
    });

    it("rejects invalid announcement kind", () => {
      expect(() =>
        upsertAnnouncementSchema.parse({
          title: "Alert",
          message: "Test message",
          kind: "funny",
          targetAudience: "all",
        }),
      ).toThrow();
    });
  });

  describe("fraud signal schemas and booking log schema", () => {
    it("accepts valid fraud signal update", () => {
      const parsed = updateFraudSignalSchema.parse({
        id: validUuid,
        status: "investigating",
        resolutionNotes: "Checking booking timeline",
      });
      expect(parsed.status).toBe("investigating");
    });

    it("accepts run fraud scan payload", () => {
      const parsed = runFraudScanSchema.parse({});
      expect(parsed).toEqual({});
    });

    it("accepts valid custom fraud signal creation", () => {
      const parsed = createCustomFraudSignalSchema.parse({
        targetType: "user",
        targetId: validUuid,
        signalType: "excessive_cancellations",
        severity: "high",
        score: 85,
        notes: "Multiple late cancellations within 48 hours",
      });
      expect(parsed.score).toBe(85);
      expect(parsed.severity).toBe("high");
    });

    it("rejects score outside 0-100", () => {
      expect(() =>
        createCustomFraudSignalSchema.parse({
          targetType: "user",
          targetId: validUuid,
          signalType: "burst_bookings",
          severity: "critical",
          score: 150,
          notes: "Burst velocity",
        }),
      ).toThrow();
    });
  });
});
