import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { id, oneOf, timestamps } from "./columns";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_KINDS,
  FRAUD_SEVERITIES,
  FRAUD_SIGNAL_TYPES,
  FRAUD_STATUSES,
  FRAUD_TARGET_TYPES,
} from "./enums";
import { users } from "./users";

export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    kind: text("kind", { enum: ANNOUNCEMENT_KINDS }).notNull().default("info"),
    targetAudience: text("target_audience", { enum: ANNOUNCEMENT_AUDIENCES })
      .notNull()
      .default("all"),
    actionUrl: text("action_url"),
    actionLabel: text("action_label"),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    index("announcements_active_dates_idx").on(t.isActive, t.startsAt, t.endsAt),
    check("announcements_kind_check", oneOf(t.kind, ANNOUNCEMENT_KINDS)),
    check("announcements_audience_check", oneOf(t.targetAudience, ANNOUNCEMENT_AUDIENCES)),
  ],
).enableRLS();

export const fraudSignals = pgTable(
  "fraud_signals",
  {
    id: id(),
    targetType: text("target_type", { enum: FRAUD_TARGET_TYPES }).notNull(),
    targetId: uuid("target_id").notNull(),
    signalType: text("signal_type", { enum: FRAUD_SIGNAL_TYPES }).notNull(),
    severity: text("severity", { enum: FRAUD_SEVERITIES }).notNull().default("medium"),
    status: text("status", { enum: FRAUD_STATUSES }).notNull().default("active"),
    score: integer("score").notNull().default(50),
    details: jsonb("details").$type<Record<string, unknown>>(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
    resolutionNotes: text("resolution_notes"),
    ...timestamps(),
  },
  (t) => [
    index("fraud_signals_target_idx").on(t.targetType, t.targetId),
    index("fraud_signals_status_severity_idx").on(t.status, t.severity),
    check("fraud_signals_target_type_check", oneOf(t.targetType, FRAUD_TARGET_TYPES)),
    check("fraud_signals_signal_type_check", oneOf(t.signalType, FRAUD_SIGNAL_TYPES)),
    check("fraud_signals_severity_check", oneOf(t.severity, FRAUD_SEVERITIES)),
    check("fraud_signals_status_check", oneOf(t.status, FRAUD_STATUSES)),
    check("fraud_signals_score_check", sql`${t.score} >= 0 and ${t.score} <= 100`),
  ],
).enableRLS();

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type FraudSignal = typeof fraudSignals.$inferSelect;
export type NewFraudSignal = typeof fraudSignals.$inferInsert;
