import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptBooking,
  addWalkIn,
  assignStaff,
  cancelBooking,
  completeBooking,
  declineBooking,
  markNoShow,
} from "@/features/bookings/actions";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import * as notifyModule from "@/lib/notify";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("bookings actions", () => {
  const userId = randomUUID();
  const shopId = randomUUID();
  const bookingId = randomUUID();
  const serviceId = randomUUID();
  const staffId = randomUUID();

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

  describe("acceptBooking", () => {
    it("fails when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const res = await acceptBooking({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("rejects unauthorized user who is not a member of the shop", async () => {
      const nonMemberUser: authModule.CurrentUser = {
        ...mockUser,
        memberships: [{ shopId: randomUUID(), role: "owner" }],
      };
      vi.spyOn(authModule, "requireUser").mockResolvedValue(nonMemberUser);

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "requested",
                staffId: null,
              },
            ]),
          }),
        }),
      } as never);

      const res = await acceptBooking({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });

    it("successfully accepts requested booking", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "requested",
                staffId: null,
              },
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
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await acceptBooking({ bookingId });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.bookingId).toBe(bookingId);
      }
    });

    it("fails when booking is already confirmed", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "confirmed",
                staffId: null,
              },
            ]),
          }),
        }),
      } as never);

      const res = await acceptBooking({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("CONFLICT");
      }
    });
  });

  describe("declineBooking", () => {
    it("successfully declines requested booking with reason", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "requested",
                staffId: null,
              },
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
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await declineBooking({ bookingId, reason: "Fully booked" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.bookingId).toBe(bookingId);
      }
    });
  });

  describe("completeBooking", () => {
    it("completes confirmed booking", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "confirmed",
                staffId: null,
              },
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
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await completeBooking({ bookingId });
      expect(res.ok).toBe(true);
    });

    it("rejects completion of requested (unconfirmed) booking", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "requested",
                staffId: null,
              },
            ]),
          }),
        }),
      } as never);

      const res = await completeBooking({ bookingId });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("CONFLICT");
      }
    });
  });

  describe("markNoShow", () => {
    it("marks confirmed booking as no-show", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "confirmed",
                staffId: null,
              },
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
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await markNoShow({ bookingId });
      expect(res.ok).toBe(true);
    });
  });

  describe("cancelBooking", () => {
    it("cancels booking with reason", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: bookingId,
                shopId,
                status: "confirmed",
                staffId: null,
              },
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
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await cancelBooking({ bookingId, reason: "Customer requested cancellation" });
      expect(res.ok).toBe(true);
    });
  });

  describe("addWalkIn", () => {
    it("adds walk-in booking and calculates start and end time", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: serviceId,
                shopId,
                name: "Standard Haircut",
                durationMin: 30,
                priceCentavos: 15000,
                active: true,
              },
            ]),
          }),
        }),
      } as never);

      const mockCreated = {
        id: randomUUID(),
        refCode: "BK-W-ABC123",
      };

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockCreated]),
            }),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await addWalkIn({
        shopId,
        serviceId,
        customerName: "Pedro Penduko",
        customerPhone: "09171234567",
        startAt: "2026-11-14T10:00:00.000Z",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.refCode).toBe("BK-W-ABC123");
      }
    });
  });

  describe("assignStaff", () => {
    it("assigns staff member to booking", async () => {
      let callCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // Booking
                return Promise.resolve([{ id: bookingId, shopId, staffId: null }]);
              }
              // Staff member
              return Promise.resolve([{ id: randomUUID(), shopId, userId: staffId, active: true }]);
            }),
          }),
        }),
      })) as never);

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

      const res = await assignStaff({ bookingId, staffId });
      expect(res.ok).toBe(true);
    });
  });

  describe("booking lifecycle notifications", () => {
    const customerId = randomUUID();

    it("dispatches booking_confirmed notification when shop accepts booking", async () => {
      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "sms",
      });

      let callCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // Booking query
                return Promise.resolve([
                  {
                    id: bookingId,
                    refCode: "BK-CONF100",
                    shopId,
                    serviceId,
                    customerId,
                    status: "requested",
                    startAt: new Date("2026-12-01T02:00:00Z"),
                    totalCentavos: 45000,
                    address: "Barangay San Antonio",
                    staffId: null,
                  },
                ]);
              }
              if (callCount === 2) {
                // Shop name query
                return Promise.resolve([{ name: "Classic Fades Barber" }]);
              }
              // Service name query
              return Promise.resolve([{ name: "Signature Haircut" }]);
            }),
          }),
        }),
      })) as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await acceptBooking({ bookingId });
      expect(res.ok).toBe(true);

      expect(sendNotifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          template: "booking_confirmed",
          payload: expect.objectContaining({
            bookingId,
            refCode: "BK-CONF100",
            shopName: "Classic Fades Barber",
            serviceName: "Signature Haircut",
            totalCentavos: 45000,
          }),
        }),
      );
    });

    it("dispatches booking_cancelled notification when shop declines booking", async () => {
      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "sms",
      });

      let callCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([
                  {
                    id: bookingId,
                    refCode: "BK-DECL200",
                    shopId,
                    serviceId,
                    customerId,
                    status: "requested",
                    staffId: null,
                  },
                ]);
              }
              if (callCount === 2) {
                return Promise.resolve([{ name: "Classic Fades Barber" }]);
              }
              return Promise.resolve([{ name: "Signature Haircut" }]);
            }),
          }),
        }),
      })) as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await declineBooking({ bookingId, reason: "Barbers unavailable at that time" });
      expect(res.ok).toBe(true);

      expect(sendNotifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          template: "booking_cancelled",
          payload: expect.objectContaining({
            bookingId,
            refCode: "BK-DECL200",
            reason: expect.stringContaining("Barbers unavailable"),
          }),
        }),
      );
    });

    it("dispatches booking_completed notification when shop completes booking", async () => {
      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "sms",
      });

      let callCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([
                  {
                    id: bookingId,
                    refCode: "BK-COMP300",
                    shopId,
                    serviceId,
                    customerId,
                    status: "confirmed",
                    staffId: null,
                  },
                ]);
              }
              if (callCount === 2) {
                return Promise.resolve([{ name: "Classic Fades Barber" }]);
              }
              return Promise.resolve([{ name: "Signature Haircut" }]);
            }),
          }),
        }),
      })) as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await completeBooking({ bookingId });
      expect(res.ok).toBe(true);

      expect(sendNotifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          template: "booking_completed",
          payload: expect.objectContaining({
            bookingId,
            refCode: "BK-COMP300",
          }),
        }),
      );
    });

    it("dispatches booking_cancelled notification when shop cancels booking", async () => {
      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "sms",
      });

      let callCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([
                  {
                    id: bookingId,
                    refCode: "BK-CANC400",
                    shopId,
                    serviceId,
                    customerId,
                    status: "confirmed",
                    staffId: null,
                  },
                ]);
              }
              if (callCount === 2) {
                return Promise.resolve([{ name: "Classic Fades Barber" }]);
              }
              return Promise.resolve([{ name: "Signature Haircut" }]);
            }),
          }),
        }),
      })) as never);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      }) as never);

      const res = await cancelBooking({ bookingId, reason: "Power outage in the area" });
      expect(res.ok).toBe(true);

      expect(sendNotifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          template: "booking_cancelled",
          payload: expect.objectContaining({
            bookingId,
            refCode: "BK-CANC400",
            reason: expect.stringContaining("Power outage"),
          }),
        }),
      );
    });
  });
});
