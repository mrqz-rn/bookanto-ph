import { describe, expect, it } from "vitest";

import {
  deletePushSubscriptionSchema,
  markNotificationReadSchema,
  savePushSubscriptionSchema,
  sendTestNotificationSchema,
  updateNotificationPreferencesSchema,
} from "@/features/notifications/schema";

describe("Notification Schemas", () => {
  describe("updateNotificationPreferencesSchema", () => {
    it("accepts valid preferences", () => {
      const valid = {
        preferredChannel: "sms",
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: false,
        whatsappEnabled: true,
        viberEnabled: false,
        bookingConfirmations: true,
        bookingReminders: true,
        bookingAutoExpiry: true,
        marketingPromos: false,
        whatsappPhone: "+639171234567",
        viberPhone: null,
      };

      const result = updateNotificationPreferencesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts all allowed channels: sms, push, email, whatsapp, viber", () => {
      const channels = ["sms", "push", "email", "whatsapp", "viber"] as const;
      for (const channel of channels) {
        const result = updateNotificationPreferencesSchema.safeParse({
          preferredChannel: channel,
          smsEnabled: true,
          emailEnabled: true,
          pushEnabled: true,
          whatsappEnabled: true,
          viberEnabled: true,
          bookingConfirmations: true,
          bookingReminders: true,
          bookingAutoExpiry: true,
          marketingPromos: false,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects unknown channel or unrecognized extra fields (strict)", () => {
      const invalid = {
        preferredChannel: "telegram", // Not supported
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: false,
        whatsappEnabled: false,
        viberEnabled: false,
        bookingConfirmations: true,
        bookingReminders: true,
        bookingAutoExpiry: true,
        marketingPromos: false,
      };

      const result = updateNotificationPreferencesSchema.safeParse(invalid);
      expect(result.success).toBe(false);

      const strictCheck = updateNotificationPreferencesSchema.safeParse({
        ...invalid,
        preferredChannel: "sms",
        unrecognizedField: "evil",
      });
      expect(strictCheck.success).toBe(false);
    });
  });

  describe("savePushSubscriptionSchema", () => {
    it("validates standard Web Push subscription object", () => {
      const valid = {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123xyz",
        keys: {
          p256dh: "BMaK7wP5L0...test",
          auth: "k8d...auth",
        },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      };

      const result = savePushSubscriptionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid URL endpoint or empty keys", () => {
      const invalid = {
        endpoint: "not-a-url",
        keys: {
          p256dh: "",
          auth: "",
        },
      };

      const result = savePushSubscriptionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("deletePushSubscriptionSchema", () => {
    it("validates endpoint URL", () => {
      const valid = {
        endpoint: "https://updates.push.services.mozilla.com/wpush/v1/test",
      };
      expect(deletePushSubscriptionSchema.safeParse(valid).success).toBe(true);
      expect(deletePushSubscriptionSchema.safeParse({ endpoint: "bad" }).success).toBe(false);
    });
  });

  describe("sendTestNotificationSchema", () => {
    it("accepts valid notification channel", () => {
      expect(sendTestNotificationSchema.safeParse({ channel: "whatsapp" }).success).toBe(true);
      expect(sendTestNotificationSchema.safeParse({ channel: "sms" }).success).toBe(true);
      expect(sendTestNotificationSchema.safeParse({ channel: "viber" }).success).toBe(true);
      expect(sendTestNotificationSchema.safeParse({ channel: "push" }).success).toBe(true);
      expect(sendTestNotificationSchema.safeParse({ channel: "email" }).success).toBe(true);
      expect(sendTestNotificationSchema.safeParse({ channel: "fax" }).success).toBe(false);
    });
  });

  describe("markNotificationReadSchema", () => {
    it("requires UUID notification id", () => {
      expect(
        markNotificationReadSchema.safeParse({
          notificationId: "4fa0aa96-b836-47d5-a75d-8a934a1bdc08",
        }).success,
      ).toBe(true);

      expect(
        markNotificationReadSchema.safeParse({
          notificationId: "not-a-uuid",
        }).success,
      ).toBe(false);
    });
  });
});
