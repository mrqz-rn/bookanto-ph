# Bookings

The four booking flows (Slot, Home, Quote, Queue), cancel and reschedule, the shop's side of the lifecycle, booking rules, and deposits and online payment.

## Where things are

- `rules.ts`: pure, browser-safe rules (expiry, cancellation window, reschedule limits, when a shop can accept, complete or mark a no-show, deposits, refunds) and `TRANSITIONS`, the lifecycle.
- `customer-actions.ts`: `createBooking` (Slot, Home, Quote), `joinQueue`, `cancelMyBooking`, `getRescheduleSlots`, `rescheduleBooking`, `sendQuote`, `acceptQuote`, `startPayment`, `setBookingRules`.
- `actions.ts`: the shop's inbox: `acceptBooking`, `declineBooking`, `completeBooking`, `markNoShow`, `cancelBooking` (by the shop, reason required), `addWalkIn`, `assignStaff`.
- `status.ts`: `changeBookingStatus(tx, …)`, the only way to change a status.
- `payments.ts`: `recordPaidCheckout` (webhook) and `settleRefunds`. The provider adapter is `lib/payments.ts` (PayMongo).
- Pages: `/book/[serviceId]`, `/account/bookings`, `/account/bookings/[id]`, `/dashboard/inbox`, `/dashboard/quotes`, `/dashboard/queue`, `/dashboard/booking-rules`.
- Routes: `/api/hooks/payments` (PayMongo webhook), `/api/cron/{expire,refunds,reminders,all}`.

## Lifecycle

Only `change_booking_status()` (migration 0011) changes `bookings.status`. It checks the booking is still in the expected status (`BK001`) and that the move is in the lifecycle (`BK002`), then writes `booking_events`. A trigger rejects status changes made any other way. Call it through `changeBookingStatus()`, which turns both errors into `CONFLICT`. `tests/unit/features/bookings/bookings-rules.test.ts` checks that the SQL list matches `TRANSITIONS`.

## Booking rules

- A request expires 2 hours after it's made (30 minutes for a same-day booking), never after its start. Quotes stand for the shop's quote window (default 24 hours). The `expire` cron job moves both to Expired.
- A customer can have 5 unanswered requests and make 10 bookings a day.
- Creating, accepting and rescheduling lock the shop row, then re-check the time with `findBookableSlot()` from availability. Two people can't get the same slot.
- Customers can cancel until the start; inside the shop's cancellation window (default 2 hours) a confirmed booking is marked `late_cancel` and any deposit is kept. They can move a booking up to the shop's limit (default 2), not inside the window, and not for quotes or queue numbers.
- Shops complete a booking once it has started, and mark a no-show from 15 minutes after the start.
- Queue numbers run per shop per Manila day (unique index), only while the shop is open. Walk-ins for a queue service take the next number too.
- A customer's phone and exact address reach the shop only after it accepts.

## Online payment

Off until `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` are set (register a webhook for `checkout_session.payment.paid` pointing at `/api/hooks/payments`). A shop then chooses nothing, a deposit (fixed or percent) or the full price in Booking rules. The amount is set on the booking when it's created (or when a quote is accepted) and paid after the shop confirms. Only the webhook marks a payment paid; it verifies the signature against the raw body and is safe to receive twice. Declined, expired, shop-cancelled and on-time customer cancellations are refunded automatically; the `refunds` cron job retries any refund the provider refused.
