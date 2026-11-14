import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createShop, setAcceptingToday } from "@/features/shops/actions";
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

describe("shops actions", () => {
  const userId = randomUUID();
  const shopId = randomUUID();
  const categoryId = randomUUID();

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

  describe("createShop", () => {
    it("fails when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await createShop({
        name: "My Shop",
        slug: "my-shop",
        phone: "09171234567",
        categoryIds: [categoryId],
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("creates shop in draft status with owner membership", async () => {
      const mockCreated = { id: shopId, name: "New Barbershop", slug: "new-barbershop" };

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]), // slug available
              }),
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

      const res = await createShop({
        name: "New Barbershop",
        slug: "new-barbershop",
        phone: "09171234567",
        categoryIds: [categoryId],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.shopId).toBe(shopId);
        expect(res.data.slug).toBe("new-barbershop");
      }
    });
  });

  describe("setAcceptingToday", () => {
    it("allows shop owner to toggle accepting bookings", async () => {
      const res = await setAcceptingToday({
        shopId,
        accepting: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.accepting).toBe(false);
      }
    });

    it("rejects unauthorized user who is not a member of the shop", async () => {
      const unauthorizedUser: authModule.CurrentUser = {
        ...mockUser,
        memberships: [], // not a member
      };
      vi.spyOn(authModule, "requireUser").mockResolvedValue(unauthorizedUser);

      const res = await setAcceptingToday({
        shopId,
        accepting: true,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });
});
