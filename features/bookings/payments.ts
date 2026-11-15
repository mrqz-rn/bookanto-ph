import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bookings, payments } from "@/lib/db/schema";
import { refundPayment, type PaidCheckoutEvent } from "@/lib/payments";

import { shouldRefund } from "./rules";

// Money movements that don't start from a signed-in user: the provider's
// webhook and the refunds job. Both are safe to run twice.

/**
 * Marks a checkout paid and adds the amount to the booking. Returns the
 * booking id, or null when the checkout isn't ours. A repeated webhook
 * changes nothing.
 */
export async function recordPaidCheckout(event: PaidCheckoutEvent): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        status: payments.status,
        amountCentavos: payments.amountCentavos,
      })
      .from(payments)
      .where(eq(payments.providerSessionId, event.sessionId))
      .for("update")
      .limit(1);
    if (!payment) return null;
    if (payment.status === "paid" || payment.status === "refunded") return payment.bookingId;

    await tx
      .update(payments)
      .set({ status: "paid", providerPaymentId: event.providerPaymentId, paidAt: sql`now()` })
      .where(eq(payments.id, payment.id));
    await tx
      .update(bookings)
      .set({ paidCentavos: sql`${bookings.paidCentavos} + ${payment.amountCentavos}` })
      .where(eq(bookings.id, payment.bookingId));
    await writeAudit(
      {
        actorId: null,
        action: "payment.paid",
        targetType: "booking",
        targetId: payment.bookingId,
        data: { paymentId: payment.id, amountCentavos: payment.amountCentavos },
      },
      tx,
    );
    return payment.bookingId;
  });
}

export type RefundsResult = { refunded: string[]; failed: string[] };

/**
 * Refunds what was paid online on bookings that ended without the service:
 * declined, expired, cancelled by the shop, or cancelled by the customer in
 * good time. Late cancellations and no-shows keep the deposit. Run after a
 * cancellation for one booking, and by the cron job for anything missed.
 */
export async function settleRefunds(bookingId?: string): Promise<RefundsResult> {
  const due = await db
    .select({
      id: payments.id,
      bookingId: payments.bookingId,
      amountCentavos: payments.amountCentavos,
      providerPaymentId: payments.providerPaymentId,
      refCode: bookings.refCode,
      status: bookings.status,
      lateCancel: bookings.lateCancel,
    })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(
      and(
        eq(payments.status, "paid"),
        isNotNull(payments.providerPaymentId),
        inArray(bookings.status, ["declined", "expired", "cancelled"]),
        bookingId ? eq(payments.bookingId, bookingId) : undefined,
      ),
    )
    .limit(200);

  const result: RefundsResult = { refunded: [], failed: [] };
  for (const payment of due) {
    if (!shouldRefund(payment.status, payment.lateCancel)) continue;

    // Claim the row first, so two runs can't both send the refund.
    const [claimed] = await db
      .update(payments)
      .set({ status: "refunded", refundedAt: sql`now()` })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "paid")))
      .returning({ id: payments.id });
    if (!claimed) continue;

    try {
      await refundPayment({
        providerPaymentId: payment.providerPaymentId!,
        amountCentavos: payment.amountCentavos,
        notes: `Booking ${payment.refCode} ${payment.status}`,
      });
    } catch {
      // Put it back for the next run; the adapter has logged the details.
      await db
        .update(payments)
        .set({ status: "paid", refundedAt: null })
        .where(eq(payments.id, payment.id));
      result.failed.push(payment.id);
      continue;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          paidCentavos: sql`greatest(${bookings.paidCentavos} - ${payment.amountCentavos}, 0)`,
        })
        .where(eq(bookings.id, payment.bookingId));
      await writeAudit(
        {
          actorId: null,
          action: "payment.refunded",
          targetType: "booking",
          targetId: payment.bookingId,
          data: { paymentId: payment.id, amountCentavos: payment.amountCentavos },
        },
        tx,
      );
    });
    result.refunded.push(payment.id);
  }
  return result;
}
