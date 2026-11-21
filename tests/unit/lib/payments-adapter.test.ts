import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

process.env.PAYMONGO_SECRET_KEY = "sk_test_123";
process.env.PAYMONGO_WEBHOOK_SECRET = "whsk_test_456";

const { createCheckout, paymentsEnabled, readPaidCheckoutEvent } = await import("@/lib/payments");

const NOW = new Date("2026-12-07T02:00:00Z");
const T = Math.floor(NOW.getTime() / 1000);
const sign = (body: string, t = T, secret = "whsk_test_456") =>
  createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

const paidEvent = JSON.stringify({
  data: {
    attributes: {
      type: "checkout_session.payment.paid",
      livemode: false,
      data: {
        id: "cs_abc",
        attributes: {
          metadata: { booking_id: "b1" },
          payments: [{ id: "pay_xyz", attributes: { status: "paid" } }],
        },
      },
    },
  },
});

afterEach(() => vi.restoreAllMocks());

describe("payments adapter", () => {
  it("is enabled when both keys are set", () => {
    expect(paymentsEnabled()).toBe(true);
  });

  it("reads a correctly signed test or live event", () => {
    const expected = { sessionId: "cs_abc", providerPaymentId: "pay_xyz" };
    expect(readPaidCheckoutEvent(paidEvent, `t=${T},te=${sign(paidEvent)},li=`, NOW)).toEqual(
      expected,
    );
    expect(readPaidCheckoutEvent(paidEvent, `t=${T},te=,li=${sign(paidEvent)}`, NOW)).toEqual(
      expected,
    );
  });

  it("rejects a tampered body, a wrong secret, an old timestamp, or no header", () => {
    const tampered = paidEvent.replace("cs_abc", "cs_evil");
    const forbidden = { code: "FORBIDDEN" };
    expect(() => readPaidCheckoutEvent(tampered, `t=${T},te=${sign(paidEvent)},li=`, NOW)).toThrow(
      expect.objectContaining(forbidden),
    );
    expect(() =>
      readPaidCheckoutEvent(paidEvent, `t=${T},te=${sign(paidEvent, T, "other")},li=`, NOW),
    ).toThrow(expect.objectContaining(forbidden));
    const old = T - 10 * 60;
    expect(() =>
      readPaidCheckoutEvent(paidEvent, `t=${old},te=${sign(paidEvent, old)},li=`, NOW),
    ).toThrow(expect.objectContaining(forbidden));
    expect(() => readPaidCheckoutEvent(paidEvent, null, NOW)).toThrow(
      expect.objectContaining(forbidden),
    );
  });

  it("ignores other event types", () => {
    const other = paidEvent.replace("checkout_session.payment.paid", "payment.failed");
    expect(readPaidCheckoutEvent(other, `t=${T},te=${sign(other)},li=`, NOW)).toBeNull();
  });

  it("creates a checkout in centavos with basic auth", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: "cs_1", attributes: { checkout_url: "https://pay/cs_1" } },
        }),
      ),
    );
    const checkout = await createCheckout({
      amountCentavos: 10_000,
      name: "Haircut at Kanto Cuts",
      description: "Booking BK-ABC123",
      reference: "BK-ABC123",
      metadata: { booking_id: "b1" },
      successUrl: "https://bookanto.ph/ok",
      cancelUrl: "https://bookanto.ph/no",
    });
    expect(checkout).toEqual({ sessionId: "cs_1", url: "https://pay/cs_1" });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.paymongo.com/v1/checkout_sessions");
    expect((init!.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from("sk_test_123:").toString("base64")}`,
    );
    const body = JSON.parse(String(init!.body));
    expect(body.data.attributes.line_items).toEqual([
      { name: "Haircut at Kanto Cuts", amount: 10_000, currency: "PHP", quantity: 1 },
    ]);
  });

  it("hides provider errors from the customer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));
    await expect(
      createCheckout({
        amountCentavos: 10_000,
        name: "x",
        description: "x",
        reference: "x",
        metadata: {},
        successUrl: "https://a",
        cancelUrl: "https://b",
      }),
    ).rejects.toMatchObject({
      code: "INTERNAL",
      message: expect.stringContaining("payment provider"),
    });
  });
});
