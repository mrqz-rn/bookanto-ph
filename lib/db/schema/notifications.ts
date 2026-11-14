import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { id, oneOf, timestamps } from "./columns";
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from "./enums";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: NOTIFICATION_CHANNELS }).notNull(),
    template: text("template").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status", { enum: NOTIFICATION_STATUSES }).notNull().default("queued"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("notifications_user_id_created_at_idx").on(t.userId, t.createdAt),
    check("notifications_channel_check", oneOf(t.channel, NOTIFICATION_CHANNELS)),
    check("notifications_status_check", oneOf(t.status, NOTIFICATION_STATUSES)),
  ],
).enableRLS();

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
    userAgent: text("user_agent"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_key").on(t.endpoint)],
).enableRLS();
