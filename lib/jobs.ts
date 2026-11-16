import "server-only";

import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bookings, notifications, services, shops } from "@/lib/db/schema";
import { settleRefunds } from "@/features/bookings/payments";
import { changeBookingStatus } from "@/features/bookings/status";
import { sendNotification } from "@/lib/notify";

export type ExpireBookingsResult = {
  expiredCount: number;
  bookingIds: string[];
};

export type SendRemindersResult = {
  remindedCount: number;
  bookingIds: string[];
};

export type ScheduledJobsSummary = {
  autoExpire: ExpireBookingsResult;
  reminders: SendRemindersResult;
  executedAt: string;
};

/**
 * Auto-expires bookings that have passed their `expiresAt` timestamp without
 * receiving a shop response (e.g. 2 hours, or 30 minutes for same-day).
 * Transitions status to "expired", creates a booking_event, writes audit_log,
 * and notifies the customer via their preferred channel.
 */
export async function expireStaleBookings(): Promise<ExpireBookingsResult> {
  const now = new Date();

  // 1. Find all stale requested or quoted bookings
  const staleBookings = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      status: bookings.status,
      customerId: bookings.customerId,
      shopId: bookings.shopId,
      serviceId: bookings.serviceId,
      shopName: shops.name,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(shops, eq(bookings.shopId, shops.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(inArray(bookings.status, ["requested", "quoted"]), lte(bookings.expiresAt, now)));

  if (staleBookings.length === 0) {
    return { expiredCount: 0, bookingIds: [] };
  }

  const expiredIds: string[] = [];

  for (const b of staleBookings) {
    await db.transaction(async (tx) => {
      // Through change_booking_status(), which also records the event.
      await changeBookingStatus(tx, {
        bookingId: b.id,
        from: b.status,
        to: "expired",
        actorId: null,
        reason:
          b.status === "quoted"
            ? "Auto-expired: quote not accepted in time"
            : "Auto-expired: shop response timeout",
      });

      // Write audit log
      await writeAudit(
        {
          actorId: null,
          action: "booking.auto_expired",
          targetType: "booking",
          targetId: b.id,
          data: { refCode: b.refCode, fromStatus: b.status },
        },
        tx,
      );
    });

    expiredIds.push(b.id);

    // Notify the customer
    if (b.customerId) {
      await sendNotification({
        userId: b.customerId,
        template: "booking_auto_expired",
        payload: {
          bookingId: b.id,
          refCode: b.refCode,
          shopName: b.shopName,
          serviceName: b.serviceName,
          reason: "Shop did not respond before the expiration window.",
        },
      });
    }
  }

  // Deposits on bookings that never happened go back to the customer.
  await settleRefunds();

  return {
    expiredCount: expiredIds.length,
    bookingIds: expiredIds,
  };
}

/**
 * Scans upcoming confirmed bookings and dispatches reminder notifications
 * to customers before their appointment (e.g. 24h or 2h before start).
 * Ensures idempotency by checking whether a reminder was already recorded in `notifications`.
 */
export async function sendBookingReminders(): Promise<SendRemindersResult> {
  const now = new Date();
  // Window: appointments starting within the next 24 hours
  const reminderWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingBookings = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      customerId: bookings.customerId,
      shopId: bookings.shopId,
      serviceId: bookings.serviceId,
      startAt: bookings.startAt,
      totalCentavos: bookings.totalCentavos,
      shopName: shops.name,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(shops, eq(bookings.shopId, shops.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.status, "confirmed"),
        gt(bookings.startAt, now),
        lte(bookings.startAt, reminderWindowEnd),
      ),
    );

  const remindedIds: string[] = [];

  for (const b of upcomingBookings) {
    if (!b.customerId) continue;

    // Check if a reminder has already been sent for this booking
    const existingReminder = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, b.customerId),
          eq(notifications.template, "booking_reminder"),
          sql`${notifications.payload}->>'bookingId' = ${b.id}`,
        ),
      )
      .limit(1);

    if (existingReminder.length > 0) {
      continue;
    }

    // Send reminder
    const result = await sendNotification({
      userId: b.customerId,
      template: "booking_reminder",
      payload: {
        bookingId: b.id,
        refCode: b.refCode,
        shopName: b.shopName,
        serviceName: b.serviceName,
        startAt: b.startAt,
        totalCentavos: b.totalCentavos ?? undefined,
      },
    });

    if (result.success) {
      remindedIds.push(b.id);
    }
  }

  return {
    remindedCount: remindedIds.length,
    bookingIds: remindedIds,
  };
}

/**
 * Runs all scheduled notification & maintenance jobs.
 */
export async function runAllScheduledJobs(): Promise<ScheduledJobsSummary> {
  const autoExpire = await expireStaleBookings();
  const reminders = await sendBookingReminders();

  return {
    autoExpire,
    reminders,
    executedAt: new Date().toISOString(),
  };
}
