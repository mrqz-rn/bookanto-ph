// The open-slot engine: turns a shop's hours, breaks, closures, holiday rules,
// staff schedules and existing bookings into bookable start times.
//
// Pure functions over plain data, so they run the same in tests, in queries
// and inside create_booking's transaction. All instants are UTC; wall-clock
// times are Manila and convert only through lib/time.ts.

import { manilaToUtc, manilaWeekday } from "@/lib/time";

import { MIN_NOTICE_MIN, SLOT_STEP_MIN, type DayHours } from "./constants";
import { holidaysOn } from "./holidays";

const MINUTE = 60_000;

/** A UTC time range, start inclusive and end exclusive, in epoch milliseconds. */
type Interval = { start: number; end: number };

export type TimeRange = { startsAt: string; endsAt: string };

export type ShopSchedule = {
  /** Weekly hours. A weekday without an entry is closed. */
  hours: DayHours[];
  /** Whole-shop closures. */
  closures: TimeRange[];
  /** Holidays the shop closes on (opens and closes null) or opens special hours on. */
  holidayRules: Array<{ holidayKey: string; opens: string | null; closes: string | null }>;
  /** Active members who take bookings. Empty means the shop doesn't schedule by staff. */
  staff: StaffSchedule[];
};

export type StaffSchedule = {
  userId: string;
  /** True: works whenever the shop is open. False: works `hours`, within the shop's hours. */
  usesShopHours: boolean;
  hours: DayHours[];
  timeOff: TimeRange[];
};

export type SlotService = {
  id: string;
  durationMin: number;
  /** Cleanup time after each booking, during which the next one can't start. */
  bufferMin: number;
  /** How many bookings of this service can overlap the same time. */
  capacity: number;
};

/** A booking that holds time (requested, quoted or confirmed). */
export type BusyBooking = {
  serviceId: string;
  staffId: string | null;
  startAt: string;
  endAt: string;
  /** The booked service's buffer. */
  bufferMin: number;
};

export type OpenSlot = {
  startAt: string;
  endAt: string;
  /** How many more bookings this start time can take. */
  remaining: number;
  /** Staff free for the whole slot; empty when the shop doesn't schedule by staff. */
  staffIds: string[];
};

/** One day of a date strip, with display labels in Manila time. */
export type SlotDay = {
  date: string;
  /** "Mon, Dec 1" */
  label: string;
  slots: Array<OpenSlot & { label: string }>;
};

export type SlotOptions = {
  now: Date;
  /** Only slots this staff member can take. */
  staffId?: string | null;
  stepMin?: number;
  minNoticeMin?: number;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** A calendar date ("yyyy-MM-dd") moved by whole days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const moved = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}

/** The day's working periods: one, or two when a break splits it. */
function dayPeriods(day: Omit<DayHours, "weekday"> | undefined): Array<[string, string]> {
  if (!day) return [];
  if (day.breakStart && day.breakEnd) {
    return [
      [day.opens, day.breakStart],
      [day.breakEnd, day.closes],
    ];
  }
  return [[day.opens, day.closes]];
}

/**
 * The shop's opening periods on a date before closures: holiday rules first,
 * then the weekly hours. Special holiday hours replace the weekly hours, with
 * no break.
 */
function shopPeriods(date: string, schedule: ShopSchedule): Array<[string, string]> {
  const holidayKeys = new Set(holidaysOn(date).map((holiday) => holiday.key));
  const rules = schedule.holidayRules.filter((rule) => holidayKeys.has(rule.holidayKey));
  if (rules.length > 0) {
    if (rules.some((rule) => !rule.opens || !rule.closes)) return [];
    // Two holidays with special hours on one date: the shorter hours win.
    const opens = rules
      .map((rule) => rule.opens!)
      .sort()
      .at(-1)!;
    const closes = rules.map((rule) => rule.closes!).sort()[0]!;
    return opens < closes ? [[opens, closes]] : [];
  }
  const weekday = manilaWeekday(manilaToUtc(date, "12:00"));
  return dayPeriods(schedule.hours.find((day) => day.weekday === weekday));
}

function toIntervals(date: string, periods: Array<[string, string]>): Interval[] {
  return periods.map(([from, to]) => ({
    start: manilaToUtc(date, from).getTime(),
    end: manilaToUtc(date, to).getTime(),
  }));
}

const fromRange = ({ startsAt, endsAt }: TimeRange): Interval => ({
  start: Date.parse(startsAt),
  end: Date.parse(endsAt),
});

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** `intervals` with every part covered by `blocks` cut out. */
function subtract(intervals: Interval[], blocks: Interval[]): Interval[] {
  let remaining = intervals;
  for (const block of blocks) {
    remaining = remaining.flatMap((interval) => {
      if (!overlaps(interval, block)) return [interval];
      const pieces: Interval[] = [];
      if (interval.start < block.start) pieces.push({ start: interval.start, end: block.start });
      if (block.end < interval.end) pieces.push({ start: block.end, end: interval.end });
      return pieces;
    });
  }
  return remaining;
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  return a.flatMap((x) =>
    b
      .map((y) => ({ start: Math.max(x.start, y.start), end: Math.min(x.end, y.end) }))
      .filter((overlap) => overlap.start < overlap.end),
  );
}

const covers = (intervals: Interval[], span: Interval) =>
  intervals.some((interval) => interval.start <= span.start && span.end <= interval.end);

/**
 * Open start times for a service on one Manila calendar date.
 *
 * Start times step from each opening period's start (so from the end of a
 * break too). A slot is open when the service fits inside opening hours and
 * outside closures, fewer than `capacity` bookings of the service overlap it
 * (counting each booking's buffer), and, when the shop schedules by staff, a
 * staff member is working, not on time off, and not booked.
 */
export function openSlotsOnDate(
  date: string,
  schedule: ShopSchedule,
  service: SlotService,
  bookings: readonly BusyBooking[],
  options: SlotOptions,
): OpenSlot[] {
  const step = (options.stepMin ?? SLOT_STEP_MIN) * MINUTE;
  const duration = service.durationMin * MINUTE;
  const hold = (service.durationMin + service.bufferMin) * MINUTE;
  const earliest = options.now.getTime() + (options.minNoticeMin ?? MIN_NOTICE_MIN) * MINUTE;

  const grid = toIntervals(date, shopPeriods(date, schedule));
  if (grid.length === 0) return [];
  const shopOpen = subtract(grid, schedule.closures.map(fromRange));

  const weekday = manilaWeekday(manilaToUtc(date, "12:00"));
  const byStaff = schedule.staff.length > 0;
  const staff = schedule.staff.map((member) => {
    const working = member.usesShopHours
      ? shopOpen
      : intersect(
          shopOpen,
          toIntervals(date, dayPeriods(member.hours.find((day) => day.weekday === weekday))),
        );
    return { userId: member.userId, open: subtract(working, member.timeOff.map(fromRange)) };
  });
  if (options.staffId && !staff.some((member) => member.userId === options.staffId)) return [];

  const busy = bookings.map((booking) => ({
    serviceId: booking.serviceId,
    staffId: booking.staffId,
    start: Date.parse(booking.startAt),
    end: Date.parse(booking.endAt) + booking.bufferMin * MINUTE,
  }));

  const slots: OpenSlot[] = [];
  for (const period of grid) {
    for (let start = period.start; start + duration <= period.end; start += step) {
      if (start < earliest) continue;
      const span = { start, end: start + duration };
      if (!covers(shopOpen, span)) continue;

      const held = busy.filter((booking) => overlaps({ start, end: start + hold }, booking));
      const capacityLeft =
        service.capacity - held.filter((booking) => booking.serviceId === service.id).length;
      if (capacityLeft <= 0) continue;

      const slot = {
        startAt: new Date(start).toISOString(),
        endAt: new Date(start + duration).toISOString(),
      };
      if (!byStaff) {
        slots.push({ ...slot, remaining: capacityLeft, staffIds: [] });
        continue;
      }

      const free = staff
        .filter(
          (member) =>
            covers(member.open, span) && !held.some((booking) => booking.staffId === member.userId),
        )
        .map((member) => member.userId);
      // Bookings not yet assigned to anyone will still need someone.
      const freeCount = free.length - held.filter((booking) => booking.staffId === null).length;
      if (freeCount <= 0) continue;

      if (options.staffId) {
        if (free.includes(options.staffId)) {
          slots.push({ ...slot, remaining: 1, staffIds: [options.staffId] });
        }
        continue;
      }
      slots.push({ ...slot, remaining: Math.min(capacityLeft, freeCount), staffIds: free });
    }
  }
  return slots;
}

/** Whether the shop is open at an instant on that Manila date: inside hours, outside breaks and closures. */
export function isOpenAt(date: string, schedule: ShopSchedule, instant: Date): boolean {
  const open = subtract(
    toIntervals(date, shopPeriods(date, schedule)),
    schedule.closures.map(fromRange),
  );
  const at = instant.getTime();
  return open.some((interval) => interval.start <= at && at < interval.end);
}

/** The open slot that starts at `startAt`, or null when that time can't be booked. */
export function findOpenSlot(
  startAt: string,
  date: string,
  schedule: ShopSchedule,
  service: SlotService,
  bookings: readonly BusyBooking[],
  options: SlotOptions,
): OpenSlot | null {
  const wanted = Date.parse(startAt);
  return (
    openSlotsOnDate(date, schedule, service, bookings, options).find(
      (slot) => Date.parse(slot.startAt) === wanted,
    ) ?? null
  );
}
