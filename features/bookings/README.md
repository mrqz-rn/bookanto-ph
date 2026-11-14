# Bookings

The booking flows (Slot and Home in phase 1; Quote and Queue in phase 2), the shop's inbox, calendar and walk-ins, and the eight-status lifecycle.

- Actions: `createBooking`, `acceptBooking`, `declineBooking`, `sendQuote`, `acceptQuote`, `cancelBooking`, `rescheduleBooking`, `completeBooking`, `markNoShow`, `addWalkIn`
- Only `change_booking_status()` changes a status; it checks the transition and writes `booking_events`.
- `create_booking()` locks the slot in a transaction; `idempotency_key` makes a double tap one booking.
- A customer's phone and exact address reach the shop only after it accepts.
