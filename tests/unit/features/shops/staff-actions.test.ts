import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addStaffMember,
  removeStaffMember,
  toggleStaffActive,
  updateStaffRole,
} from "@/features/shops/actions";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("staff actions", () => {
  const ownerId = randomUUID();
  const managerId = randomUUID();
  const staffId = randomUUID();
  const shopId = randomUUID();
  const targetUserId = randomUUID();

  const ownerUser: authModule.CurrentUser = {
    id: ownerId,
    authId: "auth-owner",
    name: "Boss Owner",
    phone: "+639171111111",
    email: "owner@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [{ shopId, role: "owner" }],
  };

  const managerUser: authModule.CurrentUser = {
    id: managerId,
    authId: "auth-manager",
    name: "Shop Manager",
    phone: "+639172222222",
    email: "manager@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [{ shopId, role: "manager" }],
  };

  const staffUser: authModule.CurrentUser = {
    id: staffId,
    authId: "auth-staff",
    name: "Barber Staff",
    phone: "+639173333333",
    email: "staff@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [{ shopId, role: "staff" }],
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addStaffMember", () => {
    it("allows owner to add new staff member", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        let callIndex = 0;
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation(() => {
                  callIndex++;
                  if (callIndex === 1) {
                    // Check user exists: return null to create new
                    return Promise.resolve([]);
                  }
                  // Check existing membership: return null
                  return Promise.resolve([]);
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
              onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await addStaffMember({
        shopId,
        name: "Kuya Mark",
        phone: "09179998877",
        role: "staff",
      });

      expect(res.ok).toBe(true);
    });

    it("allows manager to add staff member", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(managerUser);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
              onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await addStaffMember({
        shopId,
        name: "Kuya Mark",
        phone: "09179998877",
        role: "staff",
      });

      expect(res.ok).toBe(true);
    });

    it("forbids regular staff from adding staff members", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(staffUser);

      const res = await addStaffMember({
        shopId,
        name: "New Person",
        phone: "09179998877",
        role: "staff",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });

    it("forbids manager from adding another manager", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(managerUser);

      const res = await addStaffMember({
        shopId,
        name: "Co Manager",
        phone: "09179998877",
        role: "manager",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("updateStaffRole", () => {
    it("allows owner to update role of staff to manager", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([
                { id: randomUUID(), shopId, userId: targetUserId, role: "staff" },
              ]),
          }),
        }),
      } as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await updateStaffRole({
        shopId,
        userId: targetUserId,
        role: "manager",
      });

      expect(res.ok).toBe(true);
    });

    it("rejects modifying owner role", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ id: randomUUID(), shopId, userId: ownerId, role: "owner" }]),
          }),
        }),
      } as never);

      const res = await updateStaffRole({
        shopId,
        userId: ownerId,
        role: "manager",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("removeStaffMember", () => {
    it("allows owner to remove a staff member", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([
                { id: randomUUID(), shopId, userId: targetUserId, role: "staff" },
              ]),
          }),
        }),
      } as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await removeStaffMember({
        shopId,
        userId: targetUserId,
      });

      expect(res.ok).toBe(true);
    });

    it("protects owner from being removed", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ id: randomUUID(), shopId, userId: ownerId, role: "owner" }]),
          }),
        }),
      } as never);

      const res = await removeStaffMember({
        shopId,
        userId: ownerId,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("toggleStaffActive", () => {
    it("toggles active status of staff", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([
                { id: randomUUID(), shopId, userId: targetUserId, role: "staff", active: true },
              ]),
          }),
        }),
      } as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await toggleStaffActive({
        shopId,
        userId: targetUserId,
        active: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.active).toBe(false);
      }
    });
  });
});
