import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NotificationHistoryList } from "@/features/notifications/components/notification-history-list";
import { NotificationSettingsForm } from "@/features/notifications/components/notification-settings-form";
import type { Notification, NotificationPreference } from "@/lib/db/schema";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("Notification UI Components", () => {
  const mockPreferences: NotificationPreference = {
    id: "pref-1",
    userId: "user-1",
    preferredChannel: "sms",
    smsEnabled: true,
    emailEnabled: true,
    pushEnabled: true,
    whatsappEnabled: true,
    viberEnabled: false,
    bookingConfirmations: true,
    bookingReminders: true,
    bookingAutoExpiry: true,
    marketingPromos: false,
    whatsappPhone: "+639171234567",
    viberPhone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("NotificationSettingsForm", () => {
    it("explains that web push is off when the server has no VAPID key", () => {
      const html = renderToStaticMarkup(
        <NotificationSettingsForm
          initialPreferences={mockPreferences}
          userEmail="user@example.com"
          vapidPublicKey={null}
        />,
      );
      expect(html).toContain("Web push isn&#x27;t available yet");
    });

    it("renders primary channels and notification settings", () => {
      const html = renderToStaticMarkup(
        <NotificationSettingsForm
          initialPreferences={mockPreferences}
          userPhone="+639171234567"
          userEmail="user@example.com"
          hasActivePushSubscription={true}
          vapidPublicKey="test-vapid-key"
        />,
      );

      // Primary Channel cards
      expect(html).toContain("Primary Delivery Channel");
      // SMS is switched off, so it isn't offered; an old "sms" preference shows as email.
      expect(html).not.toContain("SMS");
      expect(html).toContain("Email Notifications");
      expect(html).toContain("Confirmations, reminders and receipts go to: user@example.com");
      expect(html).toContain("Web Push Alerts");
      // WhatsApp and Viber are switched off.
      expect(html).not.toContain("WhatsApp");
      expect(html).not.toContain("Viber");
      // Email can't be turned off.
      expect(html).toContain("Always on");

      // Channel settings
      expect(html).toContain("Channel Settings");
      expect(html).toContain("Web Push Notifications");
      expect(html).toContain("On for this device");
      expect(html).toContain("Turn off on this device");

      // Notification types
      expect(html).toContain("Notification Types");
      expect(html).toContain("Booking Confirmations &amp; Receipts");
      expect(html).toContain("Upcoming Appointment Reminders");
      expect(html).toContain("Auto-Expiry &amp; Status Updates");

      // Test notification card is hidden for now.
      expect(html).not.toContain("Send a Test Notification");
    });
  });

  describe("NotificationHistoryList", () => {
    it("renders empty state when there are no notifications", () => {
      const html = renderToStaticMarkup(<NotificationHistoryList notifications={[]} />);
      expect(html).toContain("No notifications yet");
      expect(html).toContain("When you receive booking confirmations");
    });

    it("renders notification items with channel icons, statuses and formatted times", () => {
      const mockNotifications: Notification[] = [
        {
          id: "notif-1",
          userId: "user-1",
          channel: "sms",
          template: "booking_confirmed",
          payload: {
            refCode: "BK-123456",
            shopName: "Kuya Jun's Barbershop",
            serviceName: "Haircut",
          },
          status: "sent",
          sentAt: new Date("2026-11-14T06:00:00Z"),
          readAt: null,
          createdAt: new Date("2026-11-14T06:00:00Z"),
          updatedAt: new Date("2026-11-14T06:00:00Z"),
        },
        {
          id: "notif-2",
          userId: "user-1",
          channel: "push",
          template: "booking_reminder",
          payload: {
            refCode: "BK-654321",
            shopName: "Fade Station",
            serviceName: "Fade Cut",
          },
          status: "sent",
          sentAt: new Date("2026-11-14T07:00:00Z"),
          readAt: new Date("2026-11-14T07:10:00Z"),
          createdAt: new Date("2026-11-14T07:00:00Z"),
          updatedAt: new Date("2026-11-14T07:10:00Z"),
        },
      ];

      const html = renderToStaticMarkup(
        <NotificationHistoryList notifications={mockNotifications} />,
      );

      expect(html).toContain("Recent Notifications");
      expect(html).toContain("1 new");
      expect(html).toContain("Mark all read");
      expect(html).toContain("Booking Confirmed &amp; Receipt");
      expect(html).toContain("Appointment Reminder");
      expect(html).toContain("Haircut at Kuya Jun&#x27;s Barbershop is confirmed. Ref: BK-123456");
      expect(html).toContain("Mark read");
    });
  });
});
