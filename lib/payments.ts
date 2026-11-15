import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

// Payments adapter. PayMongo Checkout today; only this file changes for
// another provider. Amounts are integer centavos, as PayMongo expects.

const API = "https://api.paymongo.com/v1";
const PAYMENT_METHODS = ["gcash", "paymaya", "grab_pay", "card", "qrph"];
/** Reject webhook events older than this, so a captured request can't be replayed later. */
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/** Whether online payment is configured. Shops can't ask for deposits until it is. */
export function paymentsEnabled(): boolean {
  return !!env.PAYMONGO_SECRET_KEY && !!env.PAYMONGO_WEBHOOK_SECRET;
}

async function call<T>(path: string, attributes?: Record<string, unknown>): Promise<T> {
  if (!env.PAYMONGO_SECRET_KEY) throw new AppError("INTERNAL", "Online payment isn't set up.");
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(attributes ? { data: { attributes } } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // Provider details go to the log, never to the customer.
    console.error(
      JSON.stringify({ event: "payments.provider_error", path, status: response.status, body }),
    );
    throw new AppError("INTERNAL", "We couldn't reach the payment provider. Please try again.");
  }
  return body as T;
}

export type Checkout = { sessionId: string; url: string };

/** Starts a hosted checkout for one amount and returns where to send the customer. */
export async function createCheckout(params: {
  amountCentavos: number;
  /** Shown on the checkout page and the customer's receipt. */
  name: string;
  description: string;
  /** Our booking reference, shown in the provider's dashboard. */
  reference: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<Checkout> {
  const result = await call<{ data: { id: string; attributes: { checkout_url: string } } }>(
    "/checkout_sessions",
    {
      line_items: [
        { name: params.name, amount: params.amountCentavos, currency: "PHP", quantity: 1 },
      ],
      payment_method_types: PAYMENT_METHODS,
      description: params.description,
      reference_number: params.reference,
      metadata: params.metadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      send_email_receipt: true,
    },
  );
  return { sessionId: result.data.id, url: result.data.attributes.checkout_url };
}

/** Sends a paid amount back to the customer. */
export async function refundPayment(params: {
  providerPaymentId: string;
  amountCentavos: number;
  notes: string;
}): Promise<void> {
  await call("/refunds", {
    amount: params.amountCentavos,
    payment_id: params.providerPaymentId,
    reason: "others",
    notes: params.notes.slice(0, 255),
  });
}

export type PaidCheckoutEvent = { sessionId: string; providerPaymentId: string | null };

/**
 * Checks a webhook's signature against the raw request body and returns the
 * paid checkout it reports, or null for events we don't act on. Throws
 * FORBIDDEN when the signature doesn't match.
 *
 * The header is `t=<unix seconds>,te=<test signature>,li=<live signature>`;
 * each signature is the hex HMAC-SHA256 of `<t>.<raw body>`.
 */
export function readPaidCheckoutEvent(
  rawBody: string,
  signatureHeader: string | null,
  now = new Date(),
): PaidCheckoutEvent | null {
  const secret = env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) throw new AppError("FORBIDDEN");

  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key = "", ...value] = part.split("=");
      return [key.trim(), value.join("=").trim()] as const;
    }),
  );
  const timestamp = parts.get("t");
  if (!timestamp || !/^\d+$/.test(timestamp)) throw new AppError("FORBIDDEN");
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new AppError("FORBIDDEN");
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  // A live event is signed in `li`, a test event in `te`; the other is empty.
  const matches = [parts.get("li"), parts.get("te")].some((signature) => {
    if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!matches) throw new AppError("FORBIDDEN");

  const event = JSON.parse(rawBody) as {
    data?: {
      attributes?: {
        type?: string;
        data?: {
          id?: string;
          attributes?: { payments?: Array<{ id?: string; attributes?: { status?: string } }> };
        };
      };
    };
  };
  const attributes = event.data?.attributes;
  if (attributes?.type !== "checkout_session.payment.paid" || !attributes.data?.id) return null;
  const paid = attributes.data.attributes?.payments ?? [];
  const payment = paid.find((entry) => entry.attributes?.status === "paid") ?? paid[0];
  return { sessionId: attributes.data.id, providerPaymentId: payment?.id ?? null };
}
