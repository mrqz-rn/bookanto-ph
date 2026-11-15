import { NextResponse, type NextRequest } from "next/server";

import { recordPaidCheckout, settleRefunds } from "@/features/bookings/payments";
import { AppError } from "@/lib/errors";
import { readPaidCheckoutEvent } from "@/lib/payments";

/**
 * PayMongo webhook (event `checkout_session.payment.paid`). The signature is
 * checked against the raw body before anything is parsed. Answers 200 for
 * events we don't act on, so the provider doesn't retry them.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  try {
    const event = readPaidCheckoutEvent(rawBody, request.headers.get("paymongo-signature"));
    if (!event) return NextResponse.json({ ok: true, handled: false });

    const bookingId = await recordPaidCheckout(event);
    // Paid after the booking was already cancelled or declined: send it back.
    if (bookingId) await settleRefunds(bookingId);
    return NextResponse.json({ ok: true, handled: bookingId !== null });
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    console.error(error);
    // A 500 makes the provider retry, which recordPaidCheckout handles safely.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
