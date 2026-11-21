import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { GET, POST as cronPOST } from "@/app/api/cron/[job]/route";
import { POST as smsHookPOST } from "@/app/api/hooks/send-sms/route";
import { env } from "@/lib/env";
import * as jobsModule from "@/lib/jobs";
import { smsProvider } from "@/lib/notify";

describe("API Route Handlers: Cron & SMS Hook", () => {
  describe("/api/cron/[job]", () => {
    it("rejects unauthorized calls when secret is missing or wrong", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/auto-expire", {
        headers: { "x-cron-secret": "wrong-secret" },
      });

      const res = await GET(req, { params: Promise.resolve({ job: "auto-expire" }) });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Unauthorized");
    });

    it("executes auto-expire job with valid secret", async () => {
      vi.spyOn(jobsModule, "expireStaleBookings").mockResolvedValue({
        expiredCount: 2,
        bookingIds: ["b-1", "b-2"],
      });

      const req = new NextRequest("http://localhost:3000/api/cron/auto-expire", {
        headers: { "x-cron-secret": env.CRON_SECRET },
      });

      const res = await GET(req, { params: Promise.resolve({ job: "auto-expire" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.job).toBe("auto-expire");
      expect(json.result.expiredCount).toBe(2);
    });

    it("executes reminders job with Authorization Bearer header", async () => {
      vi.spyOn(jobsModule, "sendBookingReminders").mockResolvedValue({
        remindedCount: 5,
        bookingIds: ["b-3", "b-4", "b-5", "b-6", "b-7"],
      });

      const req = new NextRequest("http://localhost:3000/api/cron/reminders", {
        method: "POST",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });

      const res = await cronPOST(req, { params: Promise.resolve({ job: "reminders" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.job).toBe("reminders");
      expect(json.result.remindedCount).toBe(5);
    });

    it("executes all scheduled jobs via /api/cron/all", async () => {
      vi.spyOn(jobsModule, "runAllScheduledJobs").mockResolvedValue({
        autoExpire: { expiredCount: 1, bookingIds: ["b-9"] },
        reminders: { remindedCount: 3, bookingIds: ["b-10", "b-11", "b-12"] },
        executedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/cron/all", {
        headers: { "x-cron-secret": env.CRON_SECRET },
      });

      const res = await GET(req, { params: Promise.resolve({ job: "all" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.result.autoExpire.expiredCount).toBe(1);
      expect(json.result.reminders.remindedCount).toBe(3);
    });

    it("returns 404 for unknown cron job", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/unknown-task", {
        headers: { "x-cron-secret": env.CRON_SECRET },
      });

      const res = await GET(req, { params: Promise.resolve({ job: "unknown-task" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("/api/hooks/send-sms", () => {
    it("handles Supabase SMS OTP hook format and dispatches SMS", async () => {
      const sendSpy = vi.spyOn(smsProvider, "sendSms").mockResolvedValue({
        success: true,
        messageId: "semaphore_sms_12345",
      });

      const payload = {
        user: {
          id: "u-supabase-1",
          phone: "+639171234567",
        },
        sms: {
          otp: "543210",
        },
      };

      const req = new NextRequest("http://localhost:3000/api/hooks/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await smsHookPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.messageId).toBe("semaphore_sms_12345");

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "+639171234567",
          text: expect.stringContaining("543210"),
        }),
      );
    });

    it("handles flat generic SMS payload with custom text", async () => {
      const sendSpy = vi.spyOn(smsProvider, "sendSms").mockResolvedValue({
        success: true,
        messageId: "sms-generic-999",
      });

      const payload = {
        phone: "09181234567",
        message: "BooKanto: Direct alert message.",
      };

      const req = new NextRequest("http://localhost:3000/api/hooks/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await smsHookPOST(req);
      expect(res.status).toBe(200);

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "+639181234567",
          text: "BooKanto: Direct alert message.",
        }),
      );
    });

    it("rejects request missing phone number", async () => {
      const req = new NextRequest("http://localhost:3000/api/hooks/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello without phone" }),
      });

      const res = await smsHookPOST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("Missing phone number");
    });
  });
});
