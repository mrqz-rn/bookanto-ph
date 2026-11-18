import {
  boolean,
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

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    preferredChannel: text("preferred_channel", { enum: NOTIFICATION_CHANNELS })
      .notNull()
      .default("email"),
    // SMS is switched off (lib/notification-channels.ts); email is the default.
    smsEnabled: boolean("sms_enabled").notNull().default(false),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
    viberEnabled: boolean("viber_enabled").notNull().default(false),
    bookingConfirmations: boolean("booking_confirmations").notNull().default(true),
    bookingReminders: boolean("booking_reminders").notNull().default(true),
    bookingAutoExpiry: boolean("booking_auto_expiry").notNull().default(true),
    marketingPromos: boolean("marketing_promos").notNull().default(false),
    whatsappPhone: text("whatsapp_phone"),
    viberPhone: text("viber_phone"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("notification_preferences_user_id_key").on(t.userId),
    check(
      "notification_preferences_channel_check",
      oneOf(t.preferredChannel, NOTIFICATION_CHANNELS),
    ),
  ],
).enableRLS();

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
