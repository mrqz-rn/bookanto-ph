import { check, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { bookings } from "./bookings";
import { id, oneOf, timestamps } from "./columns";
import { ANALYTICS_EVENT_NAMES, FUNNEL_STEPS } from "./enums";
import { services, shops } from "./shops";
import { users } from "./users";

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    eventName: text("event_name", { enum: ANALYTICS_EVENT_NAMES }).notNull(),
    sessionId: text("session_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    step: text("step", { enum: FUNNEL_STEPS }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    ...timestamps(),
  },
  (t) => [
    index("analytics_events_event_name_created_at_idx").on(t.eventName, t.createdAt),
    index("analytics_events_shop_id_created_at_idx").on(t.shopId, t.createdAt),
    index("analytics_events_session_id_idx").on(t.sessionId),
    index("analytics_events_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("analytics_events_booking_id_idx").on(t.bookingId),
    check("analytics_events_name_check", oneOf(t.eventName, ANALYTICS_EVENT_NAMES)),
  ],
).enableRLS();

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
