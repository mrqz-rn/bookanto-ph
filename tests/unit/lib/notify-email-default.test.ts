import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import {
  AVAILABLE_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_CHANNEL,
  effectiveChannel,
  SMS_NOTIFICATIONS_ENABLED,
} from "@/lib/notification-channels";
import { renderNotificationTemplate, sendNotification } from "@/lib/notify";

// SMS is switched off: email is the default channel and the fallback.

const userId = randomUUID();
const user = { id: userId, phone: "+639171234567", email: "maria@example.com" };

function preferences(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    userId,
    preferredChannel: "email",
    smsEnabled: false,
    emailEnabled: true,
    pushEnabled: true,
    whatsappEnabled: false,
    viberEnabled: false,
    bookingConfirmations: true,
    bookingReminders: true,
    bookingAutoExpiry: true,
    marketingPromos: false,
    ...overrides,
  };
}

/** db.select(): the user, then the preferences row, then (for push) no subscriptions. */
function mockSelects(prefs: ReturnType<typeof preferences> | null) {
  const rows = [[user], prefs ? [prefs] : []];
  vi.spyOn(db, "select").mockImplementation((() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() =>
        Object.assign(Promise.resolve([]), {
          limit: vi.fn().mockImplementation(() => Promise.resolve(rows.shift() ?? [])),
        }),
      ),
    }),
  })) as never);
}

function mockInserts() {
  const values = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
    onConflictDoNothing: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([preferences()]),
    }),
  });
  vi.spyOn(db, "insert").mockReturnValue({ values } as never);
  return values;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notification channels while SMS is off", () => {
  it("offers email by default and hides SMS", () => {
    expect(SMS_NOTIFICATIONS_ENABLED).toBe(false);
    expect(DEFAULT_NOTIFICATION_CHANNEL).toBe("email");
    expect(AVAILABLE_NOTIFICATION_CHANNELS).not.toContain("sms");
    expect(effectiveChannel("sms")).toBe("email");
    expect(effectiveChannel("push")).toBe("push");
    expect(effectiveChannel(null)).toBe("email");
  });

  it("creates new preferences with email preferred and SMS off", async () => {
    mockSelects(null);
    const values = mockInserts();

    await sendNotification({ userId, template: "booking_requested", payload: {} });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ preferredChannel: "email", smsEnabled: false }),
    );
  });

  it("emails someone whose saved preference still says SMS", async () => {
    mockSelects(preferences({ preferredChannel: "sms", smsEnabled: true }));
    const values = mockInserts();

    const result = await sendNotification({
      userId,
      template: "booking_confirmed",
      payload: { refCode: "BK-EMAIL1" },
    });

    expect(result).toMatchObject({ success: true, channel: "email" });
    expect(result.messageId).toMatch(/^sim_email_/);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "email", template: "booking_confirmed", status: "sent" }),
    );
  });

  it("never falls back to SMS when there's no email address", async () => {
    vi.spyOn(db, "select").mockImplementation((() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() =>
          Object.assign(Promise.resolve([]), {
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ ...user, email: null }])
              .mockResolvedValueOnce([preferences({ smsEnabled: true })]),
          }),
        ),
      }),
    })) as never);
    mockInserts();

    const result = await sendNotification({
      userId,
      template: "booking_reminder",
      payload: { refCode: "BK-NOMAIL" },
    });

    expect(result.channel).not.toBe("sms");
  });

  it("emails when push is preferred but no device is subscribed", async () => {
    mockSelects(preferences({ preferredChannel: "push" }));
    mockInserts();

    const result = await sendNotification({
      userId,
      template: "booking_reminder",
      payload: { refCode: "BK-PUSH01" },
    });

    expect(result).toMatchObject({ success: true, channel: "email" });
  });
});

describe("booking_request_received (to the shop)", () => {
  it("tells the shop who asked, for what, and links to the inbox", () => {
    const content = renderNotificationTemplate("booking_request_received", {
      bookingId: "b-1",
      refCode: "BK-SHOP01",
      shopName: "Kuya Jun's Barbershop",
      serviceName: "Gupit + Balbas",
      customerName: "Maria Santos",
      startAt: new Date("2026-12-15T06:30:00Z"),
      expiresAt: new Date("2026-12-15T02:00:00Z"),
    });

    expect(content.emailSubject).toContain("New booking request: Gupit + Balbas");
    expect(content.emailHtml).toContain("Maria Santos");
    expect(content.emailHtml).toContain("Open Booking Inbox");
    expect(content.emailHtml).toContain("/dashboard/inbox");
    expect(content.emailText).toContain("Ref: BK-SHOP01");
    expect(content.emailText).toContain("Accept or decline by");
    expect(content.push.url).toBe("/dashboard/inbox");
  });

  it("escapes a customer name that contains HTML", () => {
    const content = renderNotificationTemplate("booking_request_received", {
      customerName: '<img src=x onerror="alert(1)">',
      serviceName: "Haircut",
    });

    expect(content.emailHtml).not.toContain("<img src=x");
    expect(content.emailHtml).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
