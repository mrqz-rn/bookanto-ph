import "server-only";

import { and, asc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { availabilityTag, PUBLIC_REVALIDATE_SECONDS } from "@/lib/cache";
import { db, type DbExecutor } from "@/lib/db";
import {
  bookings,
  businessHours,
  closures,
  services,
  shopHolidayRules,
  shopMembers,
  shops,
  staffHours,
  staffSchedules,
  staffTimeOff,
  users,
  type BookingType,
  type ShopRole,
  type ShopStatus,
} from "@/lib/db/schema";
import { formatManila, manilaDate, manilaToUtc } from "@/lib/time";

import { SLOT_HOLDING_STATUSES, type DayHours } from "./constants";
import {
  addDays,
  findOpenSlot,
  isOpenAt,
  openSlotsOnDate,
  type BusyBooking,
  type OpenSlot,
  type ShopSchedule,
  type SlotDay,
  type SlotService,
  type TimeRange,
} from "./slots";

type Range = { start: Date; end: Date };

/** Postgres returns time as "09:00:00"; the app uses "09:00". */
const clock = (value: string) => value.slice(0, 5);
const clockOrNull = (value: string | null) => (value ? clock(value) : null);

function toDayHours(row: {
  weekday: number;
  opens: string;
  closes: string;
  breakStart: string | null;
  breakEnd: string | null;
}): DayHours {
  return {
    weekday: row.weekday,
    opens: clock(row.opens),
    closes: clock(row.closes),
    breakStart: clockOrNull(row.breakStart),
    breakEnd: clockOrNull(row.breakEnd),
  };
}

const toTimeRange = (row: { startsAt: Date; endsAt: Date }): TimeRange => ({
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
});

/** The UTC range covering whole Manila dates from `fromDate` through `toDate`. */
export function manilaDateRange(fromDate: string, toDate: string): Range {
  return { start: manilaToUtc(fromDate), end: manilaToUtc(addDays(toDate, 1)) };
}

/**
 * Everything the slot engine needs about a shop's schedule, with closures and
 * time off limited to `range`. Pass `tx` to read inside a transaction.
 */
export async function loadShopSchedule(
  executor: DbExecutor,
  shopId: string,
  range: Range,
): Promise<ShopSchedule> {
  const [hourRows, closureRows, ruleRows, staffRows, staffHourRows, timeOffRows] =
    await Promise.all([
      executor.select().from(businessHours).where(eq(businessHours.shopId, shopId)),
      executor
        .select({ startsAt: closures.startsAt, endsAt: closures.endsAt })
        .from(closures)
        .where(
          and(
            eq(closures.shopId, shopId),
            lt(closures.startsAt, range.end),
            gt(closures.endsAt, range.start),
          ),
        ),
      executor
        .select({
          holidayKey: shopHolidayRules.holidayKey,
          opens: shopHolidayRules.opens,
          closes: shopHolidayRules.closes,
        })
        .from(shopHolidayRules)
        .where(eq(shopHolidayRules.shopId, shopId)),
      executor
        .select({ userId: staffSchedules.userId, usesShopHours: staffSchedules.usesShopHours })
        .from(staffSchedules)
        .innerJoin(
          shopMembers,
          and(
            eq(shopMembers.shopId, staffSchedules.shopId),
            eq(shopMembers.userId, staffSchedules.userId),
          ),
        )
        .where(and(eq(staffSchedules.shopId, shopId), eq(shopMembers.active, true))),
      executor.select().from(staffHours).where(eq(staffHours.shopId, shopId)),
      executor
        .select({
          userId: staffTimeOff.userId,
          startsAt: staffTimeOff.startsAt,
          endsAt: staffTimeOff.endsAt,
        })
        .from(staffTimeOff)
        .where(
          and(
            eq(staffTimeOff.shopId, shopId),
            lt(staffTimeOff.startsAt, range.end),
            gt(staffTimeOff.endsAt, range.start),
          ),
        ),
    ]);

  return {
    hours: hourRows.map(toDayHours),
    closures: closureRows.map(toTimeRange),
    holidayRules: ruleRows.map((rule) => ({
      holidayKey: rule.holidayKey,
      opens: clockOrNull(rule.opens),
      closes: clockOrNull(rule.closes),
    })),
    staff: staffRows.map((member) => ({
      userId: member.userId,
      usesShopHours: member.usesShopHours,
      hours: staffHourRows.filter((row) => row.userId === member.userId).map(toDayHours),
      timeOff: timeOffRows.filter((row) => row.userId === member.userId).map(toTimeRange),
    })),
  };
}

/**
 * The cached schedule for public slot reads. Availability actions revalidate
 * availabilityTag(shopId). Bookings are never cached: they're read per request.
 */
function getCachedShopSchedule(shopId: string, fromDate: string, toDate: string) {
  return unstable_cache(
    () => loadShopSchedule(db, shopId, manilaDateRange(fromDate, toDate)),
    ["availability-schedule", shopId, fromDate, toDate],
    { tags: [availabilityTag(shopId)], revalidate: PUBLIC_REVALIDATE_SECONDS },
  )();
}

/** Bookings that hold time in `range` (each with its end and buffer). */
export async function loadBusyBookings(
  executor: DbExecutor,
  shopId: string,
  range: Range,
  /** A booking being moved doesn't block its own new time. */
  ignoreBookingId?: string,
): Promise<BusyBooking[]> {
  const rows = await executor
    .select({
      serviceId: bookings.serviceId,
      staffId: bookings.staffId,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      durationMin: services.durationMin,
      bufferMin: services.bufferMin,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .where(
      and(
        eq(bookings.shopId, shopId),
        inArray(bookings.status, [...SLOT_HOLDING_STATUSES]),
        // Queue numbers are served in turn; they don't hold a time.
        ne(bookings.bookingType, "queue"),
        ignoreBookingId ? ne(bookings.id, ignoreBookingId) : undefined,
        lt(bookings.startAt, range.end),
        // Booked services last at most a day, so this catches every overlap.
        gt(bookings.startAt, new Date(range.start.getTime() - 86_400_000)),
      ),
    );

  return rows.map((row) => ({
    serviceId: row.serviceId,
    staffId: row.staffId,
    startAt: row.startAt.toISOString(),
    endAt: (row.endAt ?? new Date(row.startAt.getTime() + row.durationMin * 60_000)).toISOString(),
    bufferMin: row.bufferMin,
  }));
}

export type SlotServiceInfo = SlotService & {
  shopId: string;
  name: string;
  bookingType: BookingType;
  active: boolean;
  shopStatus: ShopStatus;
};

export async function getSlotService(
  serviceId: string,
  executor: DbExecutor = db,
): Promise<SlotServiceInfo | null> {
  const [row] = await executor
    .select({
      id: services.id,
      shopId: services.shopId,
      name: services.name,
      durationMin: services.durationMin,
      bufferMin: services.bufferMin,
      capacity: services.capacity,
      bookingType: services.bookingType,
      active: services.active,
      shopStatus: shops.status,
    })
    .from(services)
    .innerJoin(shops, eq(shops.id, services.shopId))
    .where(eq(services.id, serviceId))
    .limit(1);
  return row ?? null;
}

/** Open slots for a service over `days` Manila dates starting at `fromDate`. */
export async function computeOpenSlots(params: {
  service: SlotServiceInfo;
  fromDate: string;
  days: number;
  staffId?: string | null;
  now: Date;
  /** For rescheduling: the booking being moved doesn't block its new time. */
  ignoreBookingId?: string;
}): Promise<SlotDay[]> {
  const { service, fromDate, days, staffId, now, ignoreBookingId } = params;
  const toDate = addDays(fromDate, days - 1);
  const [schedule, busy] = await Promise.all([
    getCachedShopSchedule(service.shopId, fromDate, toDate),
    loadBusyBookings(db, service.shopId, manilaDateRange(fromDate, toDate), ignoreBookingId),
  ]);

  return Array.from({ length: days }, (_, offset) => {
    const date = addDays(fromDate, offset);
    const slots = openSlotsOnDate(date, schedule, service, busy, { now, staffId });
    return {
      date,
      label: formatManila(manilaToUtc(date, "12:00"), "EEE, MMM d"),
      slots: slots.map((slot) => ({ ...slot, label: formatManila(slot.startAt, "h:mm a") })),
    };
  });
}

/**
 * Re-checks one start time against fresh data, for create_booking() to call
 * inside its transaction after locking the service row. Returns the slot
 * (with the staff free to take it) or null when it's no longer open.
 */
export async function findBookableSlot(
  tx: DbExecutor,
  params: {
    serviceId: string;
    startAt: string;
    staffId?: string | null;
    now: Date;
    ignoreBookingId?: string;
  },
): Promise<OpenSlot | null> {
  const service = await getSlotService(params.serviceId, tx);
  if (!service) return null;
  const date = manilaDate(params.startAt);
  const range = manilaDateRange(date, date);
  const [schedule, busy] = await Promise.all([
    loadShopSchedule(tx, service.shopId, range),
    loadBusyBookings(tx, service.shopId, range, params.ignoreBookingId),
  ]);
  return findOpenSlot(params.startAt, date, schedule, service, busy, {
    now: params.now,
    staffId: params.staffId,
  });
}

/** Active bookings that overlap a time range, for warning before a closure. */
export async function countHeldBookings(
  executor: DbExecutor,
  params: { shopId: string; start: Date; end: Date; staffId?: string },
): Promise<number> {
  const busy = await loadBusyBookings(executor, params.shopId, params);
  return busy.filter(
    (booking) =>
      Date.parse(booking.startAt) < params.end.getTime() &&
      Date.parse(booking.endAt) > params.start.getTime() &&
      (!params.staffId || booking.staffId === params.staffId),
  ).length;
}

// Dashboard reads. Not cached: shop staff see their own edits at once.

export type ManagedShop = { shopId: string; name: string; status: ShopStatus; role: ShopRole };

/** The shops the user is an active member of, owners' shops first. */
export async function getMemberShops(userId: string): Promise<ManagedShop[]> {
  const rows = await db
    .select({ shopId: shops.id, name: shops.name, status: shops.status, role: shopMembers.role })
    .from(shopMembers)
    .innerJoin(shops, eq(shops.id, shopMembers.shopId))
    .where(and(eq(shopMembers.userId, userId), eq(shopMembers.active, true)))
    .orderBy(
      sql`case ${shopMembers.role} when 'owner' then 0 when 'manager' then 1 else 2 end`,
      asc(shops.name),
    );
  return rows;
}

export type RangeItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  /** "Wed, Dec 24 (all day)", "Dec 24 – Dec 26 (all day)" or "Wed, Dec 24 · 3:00 PM – 7:00 PM" */
  when: string;
  reason: string | null;
};

/** A short Manila-time description of a closure or time-off range. */
export function describeRange(startsAt: Date, endsAt: Date): string {
  const atMidnight = (instant: Date) => formatManila(instant, "HH:mm") === "00:00";
  if (atMidnight(startsAt) && atMidnight(endsAt)) {
    const lastDay = new Date(endsAt.getTime() - 1);
    return manilaDate(startsAt) === manilaDate(lastDay)
      ? `${formatManila(startsAt, "EEE, MMM d")} (all day)`
      : `${formatManila(startsAt, "MMM d")} – ${formatManila(lastDay, "MMM d")} (all day)`;
  }
  if (manilaDate(startsAt) === manilaDate(endsAt)) {
    return `${formatManila(startsAt, "EEE, MMM d · h:mm a")} – ${formatManila(endsAt, "h:mm a")}`;
  }
  return `${formatManila(startsAt, "MMM d, h:mm a")} – ${formatManila(endsAt, "MMM d, h:mm a")}`;
}

const toRangeItem = (row: { id: string; startsAt: Date; endsAt: Date; reason: string | null }) => ({
  id: row.id,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  when: describeRange(row.startsAt, row.endsAt),
  reason: row.reason,
});

export type StaffMemberSchedule = {
  userId: string;
  name: string;
  role: ShopRole;
  takesBookings: boolean;
  usesShopHours: boolean;
  hours: DayHours[];
  timeOff: RangeItem[];
};

export type ServiceSlotRules = {
  id: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  capacity: number;
  bookingType: BookingType;
  active: boolean;
};

export type AvailabilityDashboard = {
  hours: DayHours[];
  closures: RangeItem[];
  holidayRules: Array<{ holidayKey: string; opens: string | null; closes: string | null }>;
  staff: StaffMemberSchedule[];
  services: ServiceSlotRules[];
};

/** Everything the availability page shows for one shop. Past closures and time off are left out. */
export async function getAvailabilityDashboard(
  shopId: string,
  now: Date,
): Promise<AvailabilityDashboard> {
  const [
    hourRows,
    closureRows,
    ruleRows,
    memberRows,
    scheduleRows,
    staffHourRows,
    timeOffRows,
    serviceRows,
  ] = await Promise.all([
    db
      .select()
      .from(businessHours)
      .where(eq(businessHours.shopId, shopId))
      .orderBy(asc(businessHours.weekday)),
    db
      .select({
        id: closures.id,
        startsAt: closures.startsAt,
        endsAt: closures.endsAt,
        reason: closures.reason,
      })
      .from(closures)
      .where(and(eq(closures.shopId, shopId), gt(closures.endsAt, now)))
      .orderBy(asc(closures.startsAt)),
    db
      .select({
        holidayKey: shopHolidayRules.holidayKey,
        opens: shopHolidayRules.opens,
        closes: shopHolidayRules.closes,
      })
      .from(shopHolidayRules)
      .where(eq(shopHolidayRules.shopId, shopId)),
    db
      .select({ userId: shopMembers.userId, role: shopMembers.role, name: users.name })
      .from(shopMembers)
      .innerJoin(users, eq(users.id, shopMembers.userId))
      .where(and(eq(shopMembers.shopId, shopId), eq(shopMembers.active, true)))
      .orderBy(
        sql`case ${shopMembers.role} when 'owner' then 0 when 'manager' then 1 else 2 end`,
        asc(users.name),
      ),
    db
      .select({ userId: staffSchedules.userId, usesShopHours: staffSchedules.usesShopHours })
      .from(staffSchedules)
      .where(eq(staffSchedules.shopId, shopId)),
    db
      .select()
      .from(staffHours)
      .where(eq(staffHours.shopId, shopId))
      .orderBy(asc(staffHours.weekday)),
    db
      .select({
        id: staffTimeOff.id,
        userId: staffTimeOff.userId,
        startsAt: staffTimeOff.startsAt,
        endsAt: staffTimeOff.endsAt,
        reason: staffTimeOff.reason,
      })
      .from(staffTimeOff)
      .where(and(eq(staffTimeOff.shopId, shopId), gt(staffTimeOff.endsAt, now)))
      .orderBy(asc(staffTimeOff.startsAt)),
    db
      .select({
        id: services.id,
        name: services.name,
        durationMin: services.durationMin,
        bufferMin: services.bufferMin,
        capacity: services.capacity,
        bookingType: services.bookingType,
        active: services.active,
      })
      .from(services)
      .where(eq(services.shopId, shopId))
      .orderBy(asc(services.sortOrder), asc(services.name)),
  ]);

  return {
    hours: hourRows.map(toDayHours),
    closures: closureRows.map(toRangeItem),
    holidayRules: ruleRows.map((rule) => ({
      holidayKey: rule.holidayKey,
      opens: clockOrNull(rule.opens),
      closes: clockOrNull(rule.closes),
    })),
    staff: memberRows.map((member) => {
      const schedule = scheduleRows.find((row) => row.userId === member.userId);
      return {
        userId: member.userId,
        name: member.name?.trim() || "Unnamed member",
        role: member.role,
        takesBookings: !!schedule,
        usesShopHours: schedule?.usesShopHours ?? true,
        hours: staffHourRows.filter((row) => row.userId === member.userId).map(toDayHours),
        timeOff: timeOffRows.filter((row) => row.userId === member.userId).map(toRangeItem),
      };
    }),
    services: serviceRows,
  };
}

/** Whether the shop is open right now (hours, breaks, holidays and closures). */
export async function isShopOpenNow(
  executor: DbExecutor,
  shopId: string,
  now: Date,
): Promise<boolean> {
  const date = manilaDate(now);
  const schedule = await loadShopSchedule(executor, shopId, manilaDateRange(date, date));
  return isOpenAt(date, schedule, now);
}
