import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings";
import { id, oneOf, timestamps } from "./columns";
import { DEPOSIT_TYPES, PAYMENT_MODES, PAYMENT_STATUSES } from "./enums";
import { shops } from "./shops";
import { users } from "./users";

// A shop's booking rules. A shop without a row uses the defaults in
// features/bookings/rules.ts.
export const bookingPolicies = pgTable(
  "booking_policies",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    // Cancelling or rescheduling closer to the start than this is "late".
    cancelWindowHours: integer("cancel_window_hours").notNull().default(2),
    maxReschedules: integer("max_reschedules").notNull().default(2),
    // How long a customer has to accept a quote.
    quoteValidHours: integer("quote_valid_hours").notNull().default(24),
    paymentMode: text("payment_mode", { enum: PAYMENT_MODES }).notNull().default("none"),
    depositType: text("deposit_type", { enum: DEPOSIT_TYPES }).notNull().default("percent"),
    // Centavos for a fixed deposit, whole percent for a percent deposit.
    depositValue: integer("deposit_value").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("booking_policies_shop_id_key").on(t.shopId),
    check("booking_policies_payment_mode_check", oneOf(t.paymentMode, PAYMENT_MODES)),
    check("booking_policies_deposit_type_check", oneOf(t.depositType, DEPOSIT_TYPES)),
    check(
      "booking_policies_ranges_check",
      sql`${t.cancelWindowHours} between 0 and 168 and ${t.maxReschedules} between 0 and 10 and ${t.quoteValidHours} between 1 and 168 and ${t.depositValue} >= 0`,
    ),
  ],
).enableRLS();

// One row per checkout started with the payment provider. Only the payments
// webhook marks a row paid.
export const payments = pgTable(
  "payments",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    amountCentavos: integer("amount_centavos").notNull(),
    status: text("status", { enum: PAYMENT_STATUSES }).notNull().default("pending"),
    provider: text("provider").notNull().default("paymongo"),
    // The provider's checkout session and, once paid, payment ids.
    providerSessionId: text("provider_session_id").notNull(),
    providerPaymentId: text("provider_payment_id"),
    checkoutUrl: text("checkout_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("payments_provider_session_id_key").on(t.providerSessionId),
    index("payments_booking_id_idx").on(t.bookingId),
    index("payments_status_idx").on(t.status),
    check("payments_status_check", oneOf(t.status, PAYMENT_STATUSES)),
    check("payments_amount_check", sql`${t.amountCentavos} > 0`),
  ],
).enableRLS();

export type BookingPolicy = typeof bookingPolicies.$inferSelect;
export type Payment = typeof payments.$inferSelect;
