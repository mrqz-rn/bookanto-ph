"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  notificationPreferences,
  notifications,
  pushSubscriptions,
  type NotificationPreference,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { getOrCreateNotificationPreferences, sendNotification } from "@/lib/notify";
import { normalizePhone } from "@/lib/phone";

import {
  deletePushSubscriptionSchema,
  markNotificationReadSchema,
  savePushSubscriptionSchema,
  sendTestNotificationSchema,
  updateNotificationPreferencesSchema,
} from "./schema";

/**
 * Updates the user's notification preferences (channels, alert types, phone numbers).
 */
export async function updateNotificationPreferencesAction(
  input: unknown,
): Promise<ActionResult<{ success: true; preferences: NotificationPreference }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(updateNotificationPreferencesSchema, input);

    // 3. Authorize
    assertCan(user, "notification:manage_own", { customerId: user.id });

    // Ensure preferences record exists
    await getOrCreateNotificationPreferences(user.id);

    // Normalize phone numbers if present
    const normalizedWa = data.whatsappPhone ? normalizePhone(data.whatsappPhone) : null;
    const normalizedViber = data.viberPhone ? normalizePhone(data.viberPhone) : null;

    // 4. Update in database
    const [updated] = await db
      .update(notificationPreferences)
      .set({
        preferredChannel: data.preferredChannel,
        smsEnabled: data.smsEnabled,
        emailEnabled: data.emailEnabled,
        pushEnabled: data.pushEnabled,
        whatsappEnabled: data.whatsappEnabled,
        viberEnabled: data.viberEnabled,
        bookingConfirmations: data.bookingConfirmations,
        bookingReminders: data.bookingReminders,
        bookingAutoExpiry: data.bookingAutoExpiry,
        marketingPromos: data.marketingPromos,
        whatsappPhone: normalizedWa,
        viberPhone: normalizedViber,
        updatedAt: sql`now()`,
      })
      .where(eq(notificationPreferences.userId, user.id))
      .returning();

    if (!updated) {
      throw new AppError("NOT_FOUND", "Notification preferences not found.");
    }

    // 5. Audit log
    await writeAudit({
      actorId: user.id,
      action: "user.notification_preferences.updated",
      targetType: "user",
      targetId: user.id,
      data: {
        preferredChannel: data.preferredChannel,
        smsEnabled: data.smsEnabled,
        emailEnabled: data.emailEnabled,
        pushEnabled: data.pushEnabled,
        whatsappEnabled: data.whatsappEnabled,
        viberEnabled: data.viberEnabled,
      },
    });

    revalidatePath("/account/notifications");

    return { success: true, preferences: updated };
  });
}

/**
 * Saves or updates a browser Web Push subscription for the authenticated user.
 */
export async function savePushSubscriptionAction(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(savePushSubscriptionSchema, input);

    // 3. Authorize
    assertCan(user, "notification:manage_own", { customerId: user.id });

    // 4. Upsert push subscription
    await db
      .insert(pushSubscriptions)
      .values({
        userId: user.id,
        endpoint: data.endpoint,
        keys: data.keys,
        userAgent: data.userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: user.id,
          keys: data.keys,
          userAgent: data.userAgent ?? null,
          updatedAt: sql`now()`,
        },
      });

    // 5. Audit log
    await writeAudit({
      actorId: user.id,
      action: "user.push_subscription.saved",
      targetType: "user",
      targetId: user.id,
      data: { endpointDomain: new URL(data.endpoint).hostname },
    });

    revalidatePath("/account/notifications");

    return { success: true };
  });
}

/**
 * Removes a Web Push subscription.
 */
export async function deletePushSubscriptionAction(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(deletePushSubscriptionSchema, input);

    // 3. Authorize
    assertCan(user, "notification:manage_own", { customerId: user.id });

    // 4. Delete subscription
    await db
      .delete(pushSubscriptions)
      .where(
        and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, data.endpoint)),
      );

    // 5. Audit log
    await writeAudit({
      actorId: user.id,
      action: "user.push_subscription.deleted",
      targetType: "user",
      targetId: user.id,
    });

    revalidatePath("/account/notifications");

    return { success: true };
  });
}

/**
 * Dispatches an immediate test notification through the requested channel.
 */
export async function sendTestNotificationAction(
  input: unknown,
): Promise<ActionResult<{ success: boolean; channel: string; messageId?: string }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(sendTestNotificationSchema, input);

    // 3. Authorize
    assertCan(user, "notification:manage_own", { customerId: user.id });

    // 4. Dispatch test notification
    const result = await sendNotification({
      userId: user.id,
      template: "test_alert",
      payload: {},
      preferredChannelOverride: data.channel,
    });

    // 5. Audit log
    await writeAudit({
      actorId: user.id,
      action: "user.notification_test.sent",
      targetType: "user",
      targetId: user.id,
      data: { channel: data.channel, success: result.success },
    });

    revalidatePath("/account/notifications");

    return {
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
    };
  });
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationReadAction(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(markNotificationReadSchema, input);

    // 3. Authorize
    assertCan(user, "notification:read_own", { customerId: user.id });

    // 4. Update
    await db
      .update(notifications)
      .set({
        readAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(notifications.id, data.notificationId), eq(notifications.userId, user.id)));

    revalidatePath("/account/notifications");

    return { success: true };
  });
}

/**
 * Marks all unread notifications for the user as read.
 */
export async function markAllNotificationsReadAction(): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Authorize
    assertCan(user, "notification:read_own", { customerId: user.id });

    // 3. Update all unread
    await db
      .update(notifications)
      .set({
        readAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

    revalidatePath("/account/notifications");

    return { success: true };
  });
}
