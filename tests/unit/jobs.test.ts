import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as auditModule from "@/lib/audit";
import { db } from "@/lib/db";
import { expireStaleBookings, runAllScheduledJobs, sendBookingReminders } from "@/lib/jobs";
import * as notifyModule from "@/lib/notify";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

describe("Background Scheduled Jobs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("expireStaleBookings", () => {
    it("returns 0 when no bookings are stale", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as never);

      const result = await expireStaleBookings();
      expect(result.expiredCount).toBe(0);
      expect(result.bookingIds).toEqual([]);
    });

    it("expires stale bookings, updates status, writes booking event and notifies customer", async () => {
      const bookingId = randomUUID();
      const customerId = randomUUID();

      const staleBookings = [
        {
          id: bookingId,
          refCode: "BK-STALE01",
          status: "requested" as const,
          customerId,
          shopId: randomUUID(),
          serviceId: randomUUID(),
          shopName: "Barbero Ko",
          serviceName: "Clean Cut",
        },
      ];

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(staleBookings),
            }),
          }),
        }),
      } as never);

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

      vi.spyOn(db, "transaction").mockImplementation((async (
        cb: (tx: typeof mockTx) => Promise<unknown>,
      ) => {
        return cb(mockTx);
      }) as never);

      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "sms",
      });

      const result = await expireStaleBookings();

      expect(result.expiredCount).toBe(1);
      expect(result.bookingIds).toContain(bookingId);

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(auditModule.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "booking.auto_expired",
          targetId: bookingId,
        }),
        mockTx,
      );

      expect(sendNotifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          template: "booking_auto_expired",
          payload: expect.objectContaining({
            bookingId,
            refCode: "BK-STALE01",
          }),
        }),
      );
    });
  });

  describe("sendBookingReminders", () => {
    it("sends reminder for upcoming confirmed bookings that have not been notified", async () => {
      const bookingId = randomUUID();
      const customerId = randomUUID();

      const upcoming = [
        {
          id: bookingId,
          refCode: "BK-REM01",
          customerId,
          shopId: randomUUID(),
          serviceId: randomUUID(),
          startAt: new Date(Date.now() + 3 * 3600 * 1000), // 3 hours from now
          totalCentavos: 50000,
          shopName: "Glam Studio",
          serviceName: "Blow dry",
        },
      ];

      let selectCallCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Query upcoming bookings
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(upcoming),
                }),
              }),
            }),
          };
        }
        // Query existing reminder check -> returns empty (no reminder sent yet)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }) as never);

      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "push",
      });

      const result = await sendBookingReminders();

      expect(result.remindedCount).toBe(1);
      expect(result.bookingIds).toContain(bookingId);
      expect(sendNotifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          template: "booking_reminder",
          payload: expect.objectContaining({
            bookingId,
            refCode: "BK-REM01",
          }),
        }),
      );
    });

    it("skips reminders when a reminder was already sent for that booking", async () => {
      const bookingId = randomUUID();
      const customerId = randomUUID();

      const upcoming = [
        {
          id: bookingId,
          refCode: "BK-REM02",
          customerId,
          shopId: randomUUID(),
          serviceId: randomUUID(),
          startAt: new Date(Date.now() + 3 * 3600 * 1000),
          totalCentavos: 50000,
          shopName: "Glam Studio",
          serviceName: "Blow dry",
        },
      ];

      let selectCallCount = 0;
      vi.spyOn(db, "select").mockImplementation((() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(upcoming),
                }),
              }),
            }),
          };
        }
        // Existing reminder found!
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "existing-reminder-id" }]),
            }),
          }),
        };
      }) as never);

      const sendNotifSpy = vi.spyOn(notifyModule, "sendNotification");

      const result = await sendBookingReminders();

      expect(result.remindedCount).toBe(0);
      expect(sendNotifSpy).not.toHaveBeenCalled();
    });
  });

  describe("runAllScheduledJobs", () => {
    it("runs both auto-expiry and reminders", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as never);

      const summary = await runAllScheduledJobs();
      expect(summary.autoExpire.expiredCount).toBe(0);
      expect(summary.reminders.remindedCount).toBe(0);
      expect(summary.executedAt).toBeDefined();
    });
  });
});
