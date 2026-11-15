import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { geographyPoint, id, oneOf, timestamps } from "./columns";
import { BOOKING_STATUSES, BOOKING_TYPES, REPORT_STATUSES } from "./enums";
import { services, shops } from "./shops";
import { users } from "./users";

// Only change_booking_status() may change status, so every move is checked
// against the lifecycle rules and recorded in booking_events.
export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    refCode: text("ref_code").notNull(),
    // Null for walk-ins the shop adds without a customer account.
    customerId: uuid("customer_id").references(() => users.id),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    // The staff member assigned to the booking.
    staffId: uuid("staff_id").references(() => users.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("requested"),
    // Home-service bookings only.
    address: text("address"),
    location: geographyPoint("location"),
    notes: text("notes"),
    quotedPriceCentavos: integer("quoted_price_centavos"),
    totalCentavos: integer("total_centavos"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // Client-generated, so a double tap on a slow connection makes one booking.
    idempotencyKey: text("idempotency_key"),
    // The service's booking type when booked; services can change type later.
    bookingType: text("booking_type", { enum: BOOKING_TYPES }).notNull().default("slot"),
    // Queue bookings only: the number called out at the shop, per shop per Manila day.
    queueNumber: integer("queue_number"),
    // The customer cancelled inside the shop's cancellation window.
    lateCancel: boolean("late_cancel").notNull().default(false),
    rescheduleCount: integer("reschedule_count").notNull().default(0),
    // What the shop asks the customer to pay online, and what has been paid.
    depositCentavos: integer("deposit_centavos").notNull().default(0),
    paidCentavos: integer("paid_centavos").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("bookings_ref_code_key").on(t.refCode),
    uniqueIndex("bookings_customer_id_idempotency_key_key").on(t.customerId, t.idempotencyKey),
    index("bookings_shop_id_start_at_idx").on(t.shopId, t.startAt),
    index("bookings_customer_id_start_at_idx").on(t.customerId, t.startAt),
    index("bookings_status_expires_at_idx").on(t.status, t.expiresAt),
    check("bookings_status_check", oneOf(t.status, BOOKING_STATUSES)),
    check("bookings_booking_type_check", oneOf(t.bookingType, BOOKING_TYPES)),
    check(
      "bookings_payment_check",
      sql`${t.depositCentavos} >= 0 and ${t.paidCentavos} >= 0 and ${t.rescheduleCount} >= 0`,
    ),
    check("bookings_range_check", sql`${t.endAt} is null or ${t.endAt} > ${t.startAt}`),
    check(
      "bookings_money_check",
      sql`coalesce(${t.quotedPriceCentavos}, 0) >= 0 and coalesce(${t.totalCentavos}, 0) >= 0`,
    ),
  ],
).enableRLS();

// Append-only (enforced by trigger).
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    // Null when the booking is first created.
    fromStatus: text("from_status", { enum: BOOKING_STATUSES }),
    toStatus: text("to_status", { enum: BOOKING_STATUSES }).notNull(),
    // Null when the system made the change (for example, expiry).
    actorId: uuid("actor_id").references(() => users.id),
    reason: text("reason"),
    ...timestamps(),
  },
  (t) => [
    index("booking_events_booking_id_created_at_idx").on(t.bookingId, t.createdAt),
    check(
      "booking_events_from_status_check",
      sql`${t.fromStatus} is null or ${oneOf(t.fromStatus, BOOKING_STATUSES)}`,
    ),
    check("booking_events_to_status_check", oneOf(t.toStatus, BOOKING_STATUSES)),
  ],
).enableRLS();

export const messages = pgTable(
  "messages",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    // Stored and shown as plain text.
    body: text("body"),
    imagePath: text("image_path"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("messages_booking_id_created_at_idx").on(t.bookingId, t.createdAt),
    index("messages_sender_id_created_at_idx").on(t.senderId, t.createdAt),
    check("messages_content_check", sql`${t.body} is not null or ${t.imagePath} is not null`),
    check("messages_body_length_check", sql`char_length(${t.body}) <= 2000`),
  ],
).enableRLS();

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    reply: text("reply"),
    hidden: boolean("hidden").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("reviews_booking_id_key").on(t.bookingId),
    // Shop pages list reviews newest first.
    index("reviews_shop_id_created_at_idx").on(t.shopId, t.createdAt),
    check("reviews_rating_check", sql`${t.rating} between 1 and 5`),
  ],
).enableRLS();

// Predefined or custom canned messages for shops to reply quickly to bookings.
export const quickReplies = pgTable(
  "quick_replies",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("quick_replies_shop_id_idx").on(t.shopId),
    check("quick_replies_title_check", sql`char_length(${t.title}) <= 100`),
    check("quick_replies_body_check", sql`char_length(${t.body}) <= 1000`),
  ],
).enableRLS();

// Disputes on bookings and reports on reviews.
export const reports = pgTable(
  "reports",
  {
    id: id(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    reviewId: uuid("review_id").references(() => reviews.id),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    status: text("status", { enum: REPORT_STATUSES }).notNull().default("open"),
    resolution: text("resolution"),
    ...timestamps(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    check("reports_target_check", sql`${t.bookingId} is not null or ${t.reviewId} is not null`),
    check("reports_status_check", oneOf(t.status, REPORT_STATUSES)),
  ],
).enableRLS();

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type NewBookingEvent = typeof bookingEvents.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type QuickReply = typeof quickReplies.$inferSelect;
export type NewQuickReply = typeof quickReplies.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type Report = typeof reports.$inferSelect;
