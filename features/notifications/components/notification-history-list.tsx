"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Notification } from "@/lib/db/schema";
import { formatManila } from "@/lib/time";

import { markAllNotificationsReadAction, markNotificationReadAction } from "../actions";
import { CHANNELS } from "../constants";

type NotificationHistoryListProps = {
  notifications: Notification[];
};

export function NotificationHistoryList({ notifications }: NotificationHistoryListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationReadAction({ notificationId: id });
      router.refresh();
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-2xs">
        <span className="text-3xl">📬</span>
        <h3 className="mt-2 text-sm font-semibold text-navy-900">No notifications yet</h3>
        <p className="mt-1 text-xs text-slate-500">
          When you receive booking confirmations, receipts or reminders, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-2xs">
      <div className="flex items-center justify-between border-b border-border p-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-bold text-navy-900">Recent Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xs font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {notifications.map((item) => {
          const ch = CHANNELS[item.channel] ?? {
            icon: "🔔",
            label: item.channel,
          };
          const isUnread = !item.readAt;
          const payload = item.payload as Record<string, unknown>;

          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:px-6 ${
                isUnread ? "bg-green-50/30" : "hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xl">{ch.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-navy-900">
                      {formatTemplateName(item.template)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {ch.label}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        item.status === "sent"
                          ? "bg-green-100 text-green-700"
                          : item.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600">
                    {formatPayloadSummary(item.template, payload)}
                  </p>

                  <span className="mt-1 block text-[11px] text-slate-400">
                    {formatManila(item.createdAt)}
                  </span>
                </div>
              </div>

              {isUnread && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(item.id)}
                  disabled={isPending}
                  className="self-end rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:self-center"
                >
                  Mark read
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTemplateName(template: string): string {
  switch (template) {
    case "booking_confirmed":
      return "Booking Confirmed & Receipt";
    case "booking_requested":
      return "Booking Request Received";
    case "booking_reminder":
      return "Appointment Reminder";
    case "booking_auto_expired":
      return "Booking Request Expired";
    case "booking_cancelled":
      return "Booking Cancelled";
    case "booking_completed":
      return "Service Completed";
    case "otp":
      return "Verification Code";
    case "test_alert":
      return "Channel Test Alert";
    default:
      return template.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function formatPayloadSummary(template: string, payload: Record<string, unknown>): string {
  const shop = typeof payload.shopName === "string" ? payload.shopName : "";
  const service = typeof payload.serviceName === "string" ? payload.serviceName : "";
  const ref = typeof payload.refCode === "string" ? `Ref: ${payload.refCode}` : "";

  if (template === "booking_confirmed") {
    return `${service} at ${shop} is confirmed. ${ref}`;
  }
  if (template === "booking_reminder") {
    return `Upcoming appointment: ${service} at ${shop}. ${ref}`;
  }
  if (template === "booking_auto_expired") {
    return `Booking request ${ref} at ${shop} expired without response.`;
  }
  if (template === "booking_cancelled") {
    return `Booking ${ref} at ${shop} was cancelled.`;
  }
  if (template === "test_alert") {
    return "Test alert verifying delivery settings.";
  }
  return ref || "Notification update";
}
