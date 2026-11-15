import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  notifications,
  pushSubscriptions,
  type Notification,
  type NotificationPreference,
  type PushSubscription,
} from "@/lib/db/schema";
import { getOrCreateNotificationPreferences } from "@/lib/notify";

/**
 * Fetches the user's notification preferences, creating defaults if not yet present.
 */
export async function getNotificationPreferencesQuery(
  userId: string,
): Promise<NotificationPreference> {
  return getOrCreateNotificationPreferences(userId);
}

/**
 * Fetches recent notifications for the user, ordered newest first.
 */
export async function getUserNotificationsQuery(
  userId: string,
  limit = 20,
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/**
 * Counts unread notifications for a user.
 */
export async function getUnreadNotificationCountQuery(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return result?.count ?? 0;
}

/**
 * Lists active push subscriptions for a user.
 */
export async function getUserPushSubscriptionsQuery(userId: string): Promise<PushSubscription[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.createdAt));
}
