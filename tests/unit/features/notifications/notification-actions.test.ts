import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deletePushSubscriptionAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions";
import * as auditModule from "@/lib/audit";
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

describe("notification server actions", () => {
  const userId = randomUUID();
  const mockUser: authModule.CurrentUser = {
    id: userId,
    authId: "auth-notif-123",
    name: "Maria Santos",
    phone: "+639181234567",
    email: "maria@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [],
  };

  beforeEach(() => {
    vi.spyOn(authModule, "requireUser").mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateNotificationPreferencesAction", () => {
    it("fails when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new AppError("UNAUTHENTICATED"));

      const result = await updateNotificationPreferencesAction({
        preferredChannel: "sms",
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        whatsappEnabled: false,
        viberEnabled: false,
        bookingConfirmations: true,
        bookingReminders: true,
        bookingAutoExpiry: true,
        marketingPromos: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("UNAUTHENTICATED");
      }
    });

    it("rejects invalid input schema", async () => {
      const result = await updateNotificationPreferencesAction({
        preferredChannel: "invalid-channel",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION");
      }
    });

    it("successfully updates preferences and normalizes messaging phones", async () => {
      const mockPref = {
        id: randomUUID(),
        userId,
        preferredChannel: "whatsapp" as const,
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        whatsappEnabled: true,
        viberEnabled: false,
        bookingConfirmations: true,
        bookingReminders: true,
        bookingAutoExpiry: true,
        marketingPromos: false,
        whatsappPhone: "+639181234567",
        viberPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(notifyModule, "getOrCreateNotificationPreferences").mockResolvedValue(mockPref);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPref]),
          }),
        }),
      } as never);

      const result = await updateNotificationPreferencesAction({
        preferredChannel: "whatsapp",
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        whatsappEnabled: true,
        viberEnabled: false,
        bookingConfirmations: true,
        bookingReminders: true,
        bookingAutoExpiry: true,
        marketingPromos: false,
        whatsappPhone: "09181234567", // raw local format
        viberPhone: null,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.success).toBe(true);
        expect(result.data.preferences.preferredChannel).toBe("whatsapp");
      }

      expect(auditModule.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.notification_preferences.updated",
          actorId: userId,
          targetId: userId,
        }),
      );
    });

    it("keeps email on and WhatsApp/Viber off whatever the input says", async () => {
      vi.spyOn(notifyModule, "getOrCreateNotificationPreferences").mockResolvedValue({} as never);
      const set = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ preferredChannel: "email" }]),
        }),
      });
      vi.spyOn(db, "update").mockReturnValue({ set } as never);

      const result = await updateNotificationPreferencesAction({
        preferredChannel: "viber",
        smsEnabled: false,
        emailEnabled: false,
        pushEnabled: true,
        whatsappEnabled: true,
        viberEnabled: true,
        bookingConfirmations: true,
        bookingReminders: true,
        bookingAutoExpiry: true,
        marketingPromos: false,
        whatsappPhone: null,
        viberPhone: null,
      });

      expect(result.ok).toBe(true);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredChannel: "email",
          emailEnabled: true,
          pushEnabled: true,
          whatsappEnabled: false,
          viberEnabled: false,
        }),
      );
    });
  });

  describe("savePushSubscriptionAction", () => {
    it("successfully registers web push subscription and turns push on", async () => {
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      } as never);
      vi.spyOn(notifyModule, "getOrCreateNotificationPreferences").mockResolvedValue({} as never);
      const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
      vi.spyOn(db, "update").mockReturnValue({ set } as never);

      const result = await savePushSubscriptionAction({
        endpoint: "https://fcm.googleapis.com/fcm/send/device-xyz",
        keys: {
          p256dh: "BMaK7wP5L0testKey",
          auth: "k8dtestAuthKey",
        },
        userAgent: "Chrome/130.0",
      });

      expect(result.ok).toBe(true);
      expect(set).toHaveBeenCalledWith(expect.objectContaining({ pushEnabled: true }));
      expect(auditModule.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.push_subscription.saved",
          actorId: userId,
        }),
      );
    });
  });

  describe("deletePushSubscriptionAction", () => {
    it("deletes web push subscription and turns push off on the last device", async () => {
      vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      } as never);
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      } as never);
      const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
      vi.spyOn(db, "update").mockReturnValue({ set } as never);

      const result = await deletePushSubscriptionAction({
        endpoint: "https://fcm.googleapis.com/fcm/send/device-xyz",
      });

      expect(result.ok).toBe(true);
      expect(set).toHaveBeenCalledWith(expect.objectContaining({ pushEnabled: false }));
      expect(auditModule.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.push_subscription.deleted",
        }),
      );
    });
  });

  describe("sendTestNotificationAction", () => {
    it("dispatches test notification to requested channel", async () => {
      vi.spyOn(notifyModule, "sendNotification").mockResolvedValue({
        success: true,
        channel: "viber",
        messageId: "test-viber-123",
      });

      const result = await sendTestNotificationAction({
        channel: "viber",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.success).toBe(true);
        expect(result.data.channel).toBe("viber");
      }
    });
  });

  describe("markNotificationReadAction", () => {
    it("updates readAt timestamp on notification", async () => {
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as never);

      const notifId = randomUUID();
      const result = await markNotificationReadAction({
        notificationId: notifId,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe("markAllNotificationsReadAction", () => {
    it("marks all unread notifications read", async () => {
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as never);

      const result = await markAllNotificationsReadAction();
      expect(result.ok).toBe(true);
    });
  });
});
