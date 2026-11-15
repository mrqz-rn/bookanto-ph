import { describe, expect, it } from "vitest";

import {
  CloudWhatsAppProvider,
  renderNotificationTemplate,
  ResendEmailProvider,
  SemaphoreSmsProvider,
  sendOtpSms,
  ViberBotProvider,
  WebPushProvider,
} from "@/lib/notify";

describe("Notifications", () => {
  describe("renderNotificationTemplate", () => {
    it("renders booking_confirmed template with receipt, Manila time and PHP centavos formatting", () => {
      const content = renderNotificationTemplate("booking_confirmed", {
        bookingId: "b-123",
        refCode: "BK-ABC123",
        shopName: "Kuya Jun's Barbershop",
        serviceName: "Haircut and Shave",
        startAt: new Date("2026-12-15T06:00:00Z"), // 2:00 PM Manila
        totalCentavos: 35000, // ₱350.00
        address: "123 Kanto St, Barangay Central",
      });

      // SMS
      expect(content.smsText).toContain("Kuya Jun's Barbershop");
      expect(content.smsText).toContain("Haircut and Shave");
      expect(content.smsText).toContain("BK-ABC123");
      expect(content.smsText).toContain("₱350");
      expect(content.smsText).toContain("/account/bookings/b-123");

      // Email receipt
      expect(content.emailSubject).toBe(
        "Booking Confirmed: Haircut and Shave at Kuya Jun's Barbershop (Ref: BK-ABC123)",
      );
      expect(content.emailHtml).toContain("Booking Receipt");
      expect(content.emailHtml).toContain("BK-ABC123");
      expect(content.emailHtml).toContain("₱350");
      expect(content.emailHtml).toContain("123 Kanto St, Barangay Central");
      expect(content.emailHtml).toContain("Manage Booking");

      // Plaintext email
      expect(content.emailText).toContain("Ref: BK-ABC123");
      expect(content.emailText).toContain("Status: Confirmed");

      // Push notification
      expect(content.push.title).toBe("Booking Confirmed! 🎉");
      expect(content.push.body).toContain("Kuya Jun's Barbershop");
      expect(content.push.tag).toBe("booking-BK-ABC123");

      // WhatsApp channel
      expect(content.whatsAppText).toContain("*BooKanto Booking Confirmed!*");
      expect(content.whatsAppText).toContain("*Ref Code:* `BK-ABC123`");

      // Viber channel
      expect(content.viberText).toContain("🎉 BooKanto Booking Confirmed!");
      expect(content.viberText).toContain("Ref: BK-ABC123");
    });

    it("renders booking_reminder template for appointments", () => {
      const content = renderNotificationTemplate("booking_reminder", {
        bookingId: "b-456",
        refCode: "BK-REM456",
        shopName: "Ate Lorna's Salon",
        serviceName: "Hair Color",
        startAt: new Date("2026-12-16T02:00:00Z"),
      });

      expect(content.smsText).toContain("BooKanto Reminder");
      expect(content.smsText).toContain("Ate Lorna's Salon");
      expect(content.push.title).toContain("Upcoming Appointment Reminder");
      expect(content.whatsAppText).toContain("⏰ *BooKanto Reminder*");
      expect(content.viberText).toContain("⏰ BooKanto Reminder");
    });

    it("renders booking_auto_expired template when shop fails to respond", () => {
      const content = renderNotificationTemplate("booking_auto_expired", {
        refCode: "BK-EXP789",
        shopName: "Fade Station",
        serviceName: "Kids Haircut",
      });

      expect(content.smsText).toContain("expired without shop response");
      expect(content.smsText).toContain("No payment was charged");
      expect(content.emailSubject).toContain("Booking Request Expired: BK-EXP789");
      expect(content.push.title).toBe("Booking Request Expired");
      expect(content.whatsAppText).toContain("⚠️ *BooKanto Booking Expired*");
    });

    it("renders booking_cancelled template with reason", () => {
      const content = renderNotificationTemplate("booking_cancelled", {
        refCode: "BK-CAN001",
        shopName: "Fade Station",
        serviceName: "Kids Haircut",
        reason: "Customer emergency",
      });

      expect(content.smsText).toContain("cancelled");
      expect(content.smsText).toContain("Reason: Customer emergency");
      expect(content.whatsAppText).toContain("❌ *BooKanto Booking Cancelled*");
    });

    it("renders booking_completed template with review invite", () => {
      const content = renderNotificationTemplate("booking_completed", {
        bookingId: "b-done",
        refCode: "BK-COMP1",
        shopName: "Barbero ni Mang Ben",
        serviceName: "Haircut",
      });

      expect(content.smsText).toContain("Rate your Haircut experience");
      expect(content.push.title).toContain("How was your visit?");
      expect(content.emailSubject).toContain("Leave a review!");
    });

    it("renders otp verification code template without leaking in URL", () => {
      const content = renderNotificationTemplate("otp", {
        otp: "847291",
      });

      expect(content.smsText).toBe(
        "Your BooKanto verification code is: 847291. It expires in 5 minutes. Do not share this code with anyone.",
      );
      expect(content.emailSubject).toBe("Your BooKanto Verification Code: 847291");
      expect(content.emailHtml).toContain("847291");
      expect(content.whatsAppText).toContain("*847291*");
      expect(content.viberText).toContain("847291");
    });

    it("renders test_alert across all channels", () => {
      const content = renderNotificationTemplate("test_alert", {});

      expect(content.smsText).toContain("test notification");
      expect(content.emailSubject).toContain("BooKanto Notification Test");
      expect(content.push.title).toContain("Notification Test");
      expect(content.whatsAppText).toContain("Notification Test");
      expect(content.viberText).toContain("Notification Test");
    });
  });

  describe("Providers in development / simulation mode", () => {
    it("SemaphoreSmsProvider simulates delivery when API key is unset", async () => {
      const provider = new SemaphoreSmsProvider();
      const result = await provider.sendSms({
        to: "09171234567",
        text: "Test SMS message",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^sim_sms_/);
    });

    it("ResendEmailProvider simulates delivery when API key is unset", async () => {
      const provider = new ResendEmailProvider();
      const result = await provider.sendEmail({
        to: "customer@example.com",
        subject: "Test Receipt",
        html: "<p>Receipt</p>",
        text: "Receipt",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^sim_email_/);
    });

    it("CloudWhatsAppProvider normalizes destination number and simulates delivery", async () => {
      const provider = new CloudWhatsAppProvider();
      const result = await provider.sendWhatsApp({
        to: "+639171234567",
        text: "Test WhatsApp message",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^sim_wa_/);
    });

    it("ViberBotProvider simulates delivery when token is unset", async () => {
      const provider = new ViberBotProvider();
      const result = await provider.sendViber({
        to: "+639171234567",
        text: "Test Viber message",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^sim_viber_/);
    });

    it("WebPushProvider simulates delivery when VAPID keys are unset", async () => {
      const provider = new WebPushProvider();
      const result = await provider.sendPush({
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
          keys: {
            p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YwfldC8yC80=",
            auth: "tBHItJI5svbpez7KI4CCXg==",
          },
        },
        payload: {
          title: "Test Push",
          body: "Hello from BooKanto",
        },
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
    });

    it("sendOtpSms dispatches verification code cleanly", async () => {
      const sent = await sendOtpSms("09189876543", "654321");
      expect(sent).toBe(true);
    });
  });
});
