import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteCategory,
  logAdminBookingView,
  rejectShop,
  resolveDispute,
  suspendShop,
  suspendUser,
  triggerFraudScan,
  unsuspendShop,
  updateFraudSignalStatus,
  updateUserRole,
  upsertCategory,
  verifyShop,
} from "@/features/admin/actions";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/features/admin/fraud-detector", () => ({
  scanForFraudSignals: vi.fn().mockResolvedValue({
    scanned: 5,
    newSignals: 2,
    updatedSignals: 1,
  }),
}));

describe("admin actions", () => {
  const adminId = randomUUID();
  const superAdminId = randomUUID();
  const customerId = randomUUID();
  const targetShopId = randomUUID();
  const targetUserId = randomUUID();
  const targetCategoryId = randomUUID();
  const targetReportId = randomUUID();
  const targetSignalId = randomUUID();
  const targetBookingId = randomUUID();

  const mockAdminUser: authModule.CurrentUser = {
    id: adminId,
    authId: "admin-auth-1",
    name: "Admin Officer",
    phone: "+639170000002",
    email: "admin@bookanto.ph",
    platformRole: "admin",
    status: "active",
    memberships: [],
  };

  const mockSuperAdminUser: authModule.CurrentUser = {
    id: superAdminId,
    authId: "super-admin-auth-1",
    name: "Platform SuperAdmin",
    phone: "+639170000001",
    email: "superadmin@bookanto.ph",
    platformRole: "super_admin",
    status: "active",
    memberships: [],
  };

  const mockCustomerUser: authModule.CurrentUser = {
    id: customerId,
    authId: "customer-auth-1",
    name: "Regular Customer",
    phone: "+639180000001",
    email: "customer@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [],
  };

  beforeEach(() => {
    vi.spyOn(authModule, "requireUser").mockResolvedValue(mockAdminUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("verifyShop", () => {
    it("fails when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await verifyShop({ shopId: targetShopId });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("UNAUTHENTICATED");
    });

    it("fails when customer attempts to verify shop", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(mockCustomerUser);

      const res = await verifyShop({ shopId: targetShopId });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
    });

    it("approves and verifies shop for admin", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ id: targetShopId, slug: "kuya-jun", status: "pending" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const res = await verifyShop({ shopId: targetShopId });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.shopId).toBe(targetShopId);
      }
    });
  });

  describe("rejectShop and suspendShop", () => {
    it("reverts shop status to draft when rejected", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetShopId, status: "pending" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const res = await rejectShop({
        shopId: targetShopId,
        reason: "Uploaded documents are blurry",
      });
      expect(res.ok).toBe(true);
    });

    it("suspends active shop with audit reason", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetShopId, status: "active" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const res = await suspendShop({
        shopId: targetShopId,
        reason: "Severe policy breach",
      });
      expect(res.ok).toBe(true);
    });

    it("unsuspends shop back to active", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetShopId, status: "suspended" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const res = await unsuspendShop({ shopId: targetShopId });
      expect(res.ok).toBe(true);
    });
  });

  describe("categories management", () => {
    it("creates new category for admin", async () => {
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: targetCategoryId }]),
        }),
      } as never);

      const res = await upsertCategory({
        name: "Pet Care",
        slug: "pet-care",
        icon: "paw-print",
        defaultBookingType: "slot",
        sortOrder: 1,
        active: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.categoryId).toBe(targetCategoryId);
    });

    it("blocks deleting category when shops are using it", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      } as never);

      const res = await deleteCategory({ id: targetCategoryId });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("CONFLICT");
    });
  });

  describe("user management", () => {
    it("prevents admin from suspending themselves", async () => {
      const res = await suspendUser({
        userId: adminId,
        reason: "Self test",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
    });

    it("prevents suspending a super admin", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetUserId, platformRole: "super_admin" }]),
          }),
        }),
      } as never);

      const res = await suspendUser({
        userId: targetUserId,
        reason: "Test",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
    });

    it("allows updating platform role only for super admin", async () => {
      // Admin attempt -> forbidden
      const failRes = await updateUserRole({
        userId: targetUserId,
        role: "admin",
      });
      expect(failRes.ok).toBe(false);
      if (!failRes.ok) expect(failRes.code).toBe("FORBIDDEN");

      // Super admin attempt -> succeeds
      vi.spyOn(authModule, "requireUser").mockResolvedValue(mockSuperAdminUser);
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetUserId, platformRole: "customer" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const successRes = await updateUserRole({
        userId: targetUserId,
        role: "admin",
      });
      expect(successRes.ok).toBe(true);
    });
  });

  describe("disputes and fraud actions", () => {
    it("resolves a dispute report", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetReportId, status: "open" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "transaction").mockImplementation(async (cb) => {
        return cb({
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as never);
      });

      const res = await resolveDispute({
        reportId: targetReportId,
        status: "resolved",
        resolution: "Customer refunded",
      });

      expect(res.ok).toBe(true);
    });

    it("updates fraud signal status", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: targetSignalId, status: "active" }]),
          }),
        }),
      } as never);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const res = await updateFraudSignalStatus({
        id: targetSignalId,
        status: "resolved",
        resolutionNotes: "Flag cleared",
      });

      expect(res.ok).toBe(true);
    });

    it("triggers on-demand fraud scan", async () => {
      const res = await triggerFraudScan({});
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.scanned).toBe(5);
        expect(res.data.newSignals).toBe(2);
      }
    });

    it("logs admin booking view to audit log", async () => {
      const res = await logAdminBookingView({ bookingId: targetBookingId });
      expect(res.ok).toBe(true);
    });
  });
});
