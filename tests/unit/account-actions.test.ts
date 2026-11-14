import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSavedAddress,
  deleteAccount,
  deleteSavedAddress,
  setDefaultAddress,
  updateProfile,
  updateSavedAddress,
} from "@/features/account/actions";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

type MockTx = Record<string, unknown>;
const mockTransaction = (fn: (tx: MockTx) => Promise<unknown>) =>
  vi.spyOn(db, "transaction").mockImplementation(fn as never);

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("account server actions", () => {
  const userId = randomUUID();
  const mockUser: authModule.CurrentUser = {
    id: userId,
    authId: "auth-123",
    name: "Juan Dela Cruz",
    phone: "+639171234567",
    email: "juan@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [],
  };

  beforeEach(() => {
    vi.spyOn(authModule, "requireUser").mockResolvedValue(mockUser);
    vi.spyOn(authModule, "signOut").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateProfile", () => {
    it("fails when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const result = await updateProfile({ name: "New Name" });
      expect(result).toEqual({
        ok: false,
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      });
    });

    it("fails on invalid input", async () => {
      const result = await updateProfile({ name: "" });
      expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    });

    it("detects phone conflict with another account", async () => {
      const otherUserId = randomUUID();
      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: otherUserId }]),
              }),
            }),
          }),
        };
        return callback(tx as never);
      });

      const result = await updateProfile({
        name: "Juan",
        phone: "09181234567",
      });

      expect(result).toMatchObject({
        ok: false,
        code: "CONFLICT",
        message: expect.stringContaining("phone number is already linked"),
      });
    });

    it("successfully updates profile", async () => {
      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return callback(tx as never);
      });

      const result = await updateProfile({
        name: "Juan Updated",
        email: "juan.updated@example.com",
        phone: "09171234567",
      });

      expect(result).toEqual({ ok: true, data: { success: true } });
    });
  });

  describe("deleteAccount", () => {
    it("refuses if user is the owner of an active shop", async () => {
      const ownerUser: authModule.CurrentUser = {
        ...mockUser,
        memberships: [{ shopId: "shop-1", role: "owner" }],
      };
      vi.spyOn(authModule, "requireUser").mockResolvedValue(ownerUser);

      const result = await deleteAccount({ confirmation: "DELETE" });
      expect(result).toMatchObject({
        ok: false,
        code: "FORBIDDEN",
        message: expect.stringContaining("transfer or close your shops"),
      });
    });

    it("soft deletes user and calls global sign out", async () => {
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      const deleteMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          update: updateMock,
          delete: deleteMock,
        };
        return callback(tx as never);
      });

      const result = await deleteAccount({ confirmation: "DELETE" });
      expect(result).toEqual({ ok: true, data: { success: true } });
      expect(authModule.signOut).toHaveBeenCalledWith("global");
    });
  });

  describe("createSavedAddress", () => {
    it("creates address and sets default if it is the first one", async () => {
      const createdAddress = {
        id: randomUUID(),
        userId,
        label: "Home",
        recipientName: "Juan",
        phone: "+639171234567",
        streetAddress: "123 Rizal St.",
        cityId: null,
        barangayId: null,
        notes: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([createdAddress]),
            }),
          }),
        };
        return callback(tx as never);
      });

      const result = await createSavedAddress({
        label: "Home",
        streetAddress: "123 Rizal St.",
      });

      expect(result).toEqual({ ok: true, data: createdAddress });
    });
  });

  describe("updateSavedAddress", () => {
    it("returns NOT_FOUND when address does not belong to user", async () => {
      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
        return callback(tx as never);
      });

      const result = await updateSavedAddress({
        id: randomUUID(),
        label: "Office",
        streetAddress: "456 Ortigas Ave.",
      });

      expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    });
  });

  describe("deleteSavedAddress", () => {
    it("deletes address and promotes next default if deleted was default", async () => {
      const addressId = randomUUID();
      const nextId = randomUUID();

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: addressId, isDefault: true }]),
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: nextId }]),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
          update: updateMock,
        };
        return callback(tx as never);
      });

      const result = await deleteSavedAddress({ id: addressId });
      expect(result).toEqual({ ok: true, data: { success: true } });
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe("setDefaultAddress", () => {
    it("sets chosen address to default and resets others", async () => {
      const addressId = randomUUID();
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.spyOn(db, "transaction").mockImplementation(async (callback: TxCallback) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: addressId }]),
              }),
            }),
          }),
          update: updateMock,
        };
        return callback(tx as never);
      });

      const result = await setDefaultAddress({ id: addressId });
      expect(result).toEqual({ ok: true, data: { success: true } });
      expect(updateMock).toHaveBeenCalledTimes(2);
    });
  });
});
