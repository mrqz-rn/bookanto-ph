import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "./columns";
import { shopMembers, shops } from "./shops";

// Per-staff schedules and holiday rules. Shop-wide weekly hours and closures
// live in business_hours and closures (shops.ts). Wall-clock times are Manila
// time; instants are UTC.

// Shop members who take bookings. A member without a row is never assigned
// one. When a shop has no rows at all, slots don't depend on staff.
export const staffSchedules = pgTable(
  "staff_schedules",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    // True: works whenever the shop is open. False: works the staff_hours rows.
    usesShopHours: boolean("uses_shop_hours").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("staff_schedules_shop_id_user_id_key").on(t.shopId, t.userId),
    // Only members of the shop; removing the member removes the schedule.
    foreignKey({
      name: "staff_schedules_member_fk",
      columns: [t.shopId, t.userId],
      foreignColumns: [shopMembers.shopId, shopMembers.userId],
    }).onDelete("cascade"),
  ],
).enableRLS();

// A staff member's own weekly hours, used when uses_shop_hours is false. A
// weekday without a row is a day off. Slots also need the shop to be open.
export const staffHours = pgTable(
  "staff_hours",
  {
    id: id(),
    shopId: uuid("shop_id").notNull(),
    userId: uuid("user_id").notNull(),
    // 0 = Sunday … 6 = Saturday.
    weekday: smallint("weekday").notNull(),
    opens: time("opens").notNull(),
    closes: time("closes").notNull(),
    breakStart: time("break_start"),
    breakEnd: time("break_end"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("staff_hours_shop_id_user_id_weekday_key").on(t.shopId, t.userId, t.weekday),
    foreignKey({
      name: "staff_hours_schedule_fk",
      columns: [t.shopId, t.userId],
      foreignColumns: [staffSchedules.shopId, staffSchedules.userId],
    }).onDelete("cascade"),
    check("staff_hours_weekday_check", sql`${t.weekday} between 0 and 6`),
    check("staff_hours_range_check", sql`${t.closes} > ${t.opens}`),
    check(
      "staff_hours_break_check",
      sql`(${t.breakStart} is null and ${t.breakEnd} is null) or (${t.breakStart} is not null and ${t.breakEnd} is not null and ${t.breakStart} > ${t.opens} and ${t.breakEnd} > ${t.breakStart} and ${t.breakEnd} < ${t.closes})`,
    ),
  ],
).enableRLS();

// Time a staff member is away (leave, errands, blocked time). Whole-shop
// closures go in closures.
export const staffTimeOff = pgTable(
  "staff_time_off",
  {
    id: id(),
    shopId: uuid("shop_id").notNull(),
    userId: uuid("user_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    ...timestamps(),
  },
  (t) => [
    index("staff_time_off_shop_id_starts_at_idx").on(t.shopId, t.startsAt),
    foreignKey({
      name: "staff_time_off_member_fk",
      columns: [t.shopId, t.userId],
      foreignColumns: [shopMembers.shopId, shopMembers.userId],
    }).onDelete("cascade"),
    check("staff_time_off_range_check", sql`${t.endsAt} > ${t.startsAt}`),
    check("staff_time_off_reason_length_check", sql`char_length(${t.reason}) <= 200`),
  ],
).enableRLS();

// How a shop handles each holiday it doesn't keep normal hours on. Holiday
// keys and dates come from features/availability/holidays.ts, so the rules
// apply every year without the shop re-entering them. Null hours mean closed;
// set hours replace that day's weekly hours.
export const shopHolidayRules = pgTable(
  "shop_holiday_rules",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    holidayKey: text("holiday_key").notNull(),
    opens: time("opens"),
    closes: time("closes"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("shop_holiday_rules_shop_id_holiday_key_key").on(t.shopId, t.holidayKey),
    check("shop_holiday_rules_holiday_key_check", sql`${t.holidayKey} ~ '^[a-z0-9_]{1,50}$'`),
    check(
      "shop_holiday_rules_hours_check",
      sql`(${t.opens} is null and ${t.closes} is null) or (${t.opens} is not null and ${t.closes} is not null and ${t.closes} > ${t.opens})`,
    ),
  ],
).enableRLS();

export type StaffSchedule = typeof staffSchedules.$inferSelect;
export type StaffHours = typeof staffHours.$inferSelect;
export type StaffTimeOff = typeof staffTimeOff.$inferSelect;
export type ShopHolidayRule = typeof shopHolidayRules.$inferSelect;
