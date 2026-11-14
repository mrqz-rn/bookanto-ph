import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyCategoryTemplates,
  bulkImportServices,
  createMembership,
  createPackage,
  createService,
  createServiceAddon,
} from "@/features/services/actions";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("services actions", () => {
  const userId = randomUUID();
  const shopId = randomUUID();
  const serviceId = randomUUID();

  const mockUser: authModule.CurrentUser = {
    id: userId,
    authId: "auth-user-1",
    name: "Juan Dela Cruz",
    phone: "+639171234567",
    email: "juan@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [{ shopId, role: "owner" }],
  };

  beforeEach(() => {
    vi.spyOn(authModule, "requireUser").mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createService", () => {
    it("creates fixed-price service when authorized", async () => {
      const mockCreated = { id: serviceId, name: "Fade Cut", priceCentavos: 18000 };

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ max: 0 }]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockCreated]),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await createService({
        shopId,
        name: "Fade Cut",
        priceType: "fixed",
        priceCentavos: 18000,
        durationMin: 30,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 5,
        active: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.serviceId).toBe(serviceId);
      }
    });

    it("rejects unauthorized user who does not own/manage shop", async () => {
      const unauthorizedUser: authModule.CurrentUser = {
        ...mockUser,
        memberships: [],
      };
      vi.spyOn(authModule, "requireUser").mockResolvedValue(unauthorizedUser);

      const res = await createService({
        shopId,
        name: "Fade Cut",
        priceType: "fixed",
        priceCentavos: 18000,
        durationMin: 30,
        bookingType: "slot",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("createServiceAddon", () => {
    it("creates add-on for service", async () => {
      const addonId = randomUUID();
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: addonId }]),
        }),
      } as never);

      const res = await createServiceAddon({
        serviceId,
        shopId,
        name: "Menthol Shampoo",
        priceCentavos: 5000,
        durationMin: 5,
        active: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.addonId).toBe(addonId);
      }
    });
  });

  describe("createPackage", () => {
    it("creates bundled package", async () => {
      const packageId = randomUUID();
      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: packageId, name: "Combo" }]),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await createPackage({
        shopId,
        name: "Combo Package",
        priceCentavos: 25000,
        originalPriceCentavos: 30000,
        serviceItems: [{ serviceId, quantity: 1 }],
        active: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.packageId).toBe(packageId);
      }
    });
  });

  describe("createMembership", () => {
    it("creates membership plan", async () => {
      const memId = randomUUID();
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: memId, name: "VIP" }]),
        }),
      } as never);

      const res = await createMembership({
        shopId,
        name: "Monthly VIP",
        priceCentavos: 99900,
        cadence: "monthly",
        validityDays: 30,
        active: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.membershipId).toBe(memId);
      }
    });
  });

  describe("bulkImportServices", () => {
    it("imports multiple services in a single transactional batch", async () => {
      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ max: 0 }]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue([]),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await bulkImportServices({
        shopId,
        services: [
          {
            name: "Haircut",
            priceType: "fixed",
            priceCentavos: 15000,
            durationMin: 30,
            bookingType: "slot",
            capacity: 1,
            bufferMin: 5,
          },
          {
            name: "Hair Color",
            priceType: "starts_at",
            priceCentavos: 120000,
            durationMin: 120,
            bookingType: "slot",
            capacity: 1,
            bufferMin: 10,
          },
        ],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.importedCount).toBe(2);
      }
    });
  });

  describe("applyCategoryTemplates", () => {
    it("applies category templates with add-ons", async () => {
      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ max: 0 }]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: serviceId }]),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await applyCategoryTemplates({
        shopId,
        templates: [
          {
            name: "Standard Haircut",
            description: "Classic cut",
            priceType: "fixed",
            priceCentavos: 15000,
            durationMin: 30,
            bookingType: "slot",
            capacity: 1,
            bufferMin: 5,
            suggestedAddons: [{ name: "Hair Wash", priceCentavos: 5000, durationMin: 10 }],
          },
        ],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.addedCount).toBe(1);
      }
    });
  });
});
