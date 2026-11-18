import type { Metadata } from "next";

import { NotificationHistoryList } from "@/features/notifications/components/notification-history-list";
import { NotificationSettingsForm } from "@/features/notifications/components/notification-settings-form";
import {
  getNotificationPreferencesQuery,
  getUserNotificationsQuery,
  getUserPushSubscriptionsQuery,
} from "@/features/notifications/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Notification Settings",
  description:
    "Manage how BooKanto reaches you: email confirmations and reminders, web push, and messaging channels.",
};

export default async function NotificationsPage() {
  const user = await requireUser();

  const [preferences, recentNotifications, pushSubs] = await Promise.all([
    getNotificationPreferencesQuery(user.id),
    getUserNotificationsQuery(user.id, 20),
    getUserPushSubscriptionsQuery(user.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Control how and when BooKanto notifies you for booking confirmations, receipts, reminders,
          and auto-expiry.
        </p>
      </div>

      <NotificationSettingsForm
        initialPreferences={preferences}
        userPhone={user.phone}
        userEmail={user.email}
        hasActivePushSubscription={pushSubs.length > 0}
      />

      <NotificationHistoryList notifications={recentNotifications} />
    </div>
  );
}
