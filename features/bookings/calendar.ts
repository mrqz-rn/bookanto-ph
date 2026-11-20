import { formatManila, manilaDate, manilaToUtc } from "@/lib/time";
import type { BookingListItem } from "./constants";
import { bookingEndMs } from "./today";

// Pure helpers for the shop calendar. Days are Manila calendar dates written
// "yyyy-MM-dd" (a "date key"). Date-key arithmetic runs on UTC midnights, so it
// never depends on the browser's time zone; instants become date keys and
// minutes of the day only through lib/time.ts.

export type CalendarView = "week" | "month";

export const CALENDAR_VIEWS: CalendarView[] = ["week", "month"];

const DAY_MS = 86_400_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function keyToMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function msToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whether a string is a real calendar date in "yyyy-MM-dd" form. */
export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_KEY.test(value) && msToKey(keyToMs(value)) === value;
}

export function addDays(key: string, days: number): string {
  return msToKey(keyToMs(key) + days * DAY_MS);
}

/** The first day of the month `months` away from the month holding `key`. */
export function addMonths(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  return msToKey(Date.UTC(y!, m! - 1 + months, 1));
}

/** 0 = Sunday … 6 = Saturday, as in business_hours. */
export function weekdayOf(key: string): number {
  return new Date(keyToMs(key)).getUTCDay();
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** The seven days of the Sunday-to-Saturday week holding `key`. */
export function weekOf(key: string): string[] {
  const sunday = addDays(key, -weekdayOf(key));
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

/** Whole weeks covering the month holding `key` (35 or 42 days, sometimes 28). */
export function monthGridOf(key: string): string[] {
  const first = addMonths(key, 0);
  const last = addDays(addMonths(key, 1), -1);
  const start = addDays(first, -weekdayOf(first));
  const end = addDays(last, 6 - weekdayOf(last));
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The days a view shows around `key`. */
export function visibleDays(view: CalendarView, key: string): string[] {
  return view === "week" ? weekOf(key) : monthGridOf(key);
}

/** Where the previous or next arrow goes. */
export function stepDate(view: CalendarView, key: string, direction: -1 | 1): string {
  if (view === "week") return addDays(key, 7 * direction);
  const target = addMonths(key, direction);
  // Keep the day of the month where it exists (Jan 31 → Feb 28).
  const day = Math.min(Number(key.slice(8)), Number(addDays(addMonths(target, 1), -1).slice(8)));
  return `${target.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

/**
 * The days the server loads for a visit: the month grids of the month before,
 * the month of `key` and the month after, so the arrows move without a reload
 * until they leave this window.
 */
export function loadWindow(key: string): { from: string; to: string } {
  const before = monthGridOf(addMonths(key, -1));
  const after = monthGridOf(addMonths(key, 1));
  return { from: before[0]!, to: after[after.length - 1]! };
}

/** The UTC instants bounding a window of Manila days, for the bookings query. */
export function windowInstants(window: { from: string; to: string }): {
  startIso: string;
  endIso: string;
} {
  return {
    startIso: manilaToUtc(window.from, "00:00").toISOString(),
    endIso: manilaToUtc(window.to, "23:59:59.999").toISOString(),
  };
}

export function inWindow(days: string[], window: { from: string; to: string }): boolean {
  return days[0]! >= window.from && days[days.length - 1]! <= window.to;
}

/** Formats a date key, read as noon in Manila so the date never shifts. */
export function formatDay(key: string, pattern: string): string {
  return formatManila(manilaToUtc(key, "12:00"), pattern);
}

/** "November 2026" or "Nov 15 – 21, 2026" (or "Nov 29 – Dec 5, 2026"). */
export function rangeTitle(view: CalendarView, key: string): string {
  if (view === "month") return formatDay(key, "MMMM yyyy");
  const days = weekOf(key);
  const first = days[0]!;
  const last = days[6]!;
  if (first.slice(0, 4) !== last.slice(0, 4)) {
    return `${formatDay(first, "MMM d, yyyy")} – ${formatDay(last, "MMM d, yyyy")}`;
  }
  if (sameMonth(first, last)) {
    return `${formatDay(first, "MMM d")} – ${formatDay(last, "d, yyyy")}`;
  }
  return `${formatDay(first, "MMM d")} – ${formatDay(last, "MMM d, yyyy")}`;
}

// ---------------------------------------------------------------------------
// Times of day
// ---------------------------------------------------------------------------

/** Minutes after Manila midnight of an instant. */
export function manilaMinutes(instant: Date | string | number): number {
  const [h, m] = formatManila(instant, "H:m").split(":").map(Number);
  return h! * 60 + m!;
}

/** Minutes after midnight of a "HH:mm" or "HH:mm:ss" time. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "2 PM", "2:30 PM", "12 PM". */
export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** One weekday's opening hours, as saved in business_hours. */
export type WeekdayHours = {
  weekday: number;
  opens: string;
  closes: string;
  breakStart: string | null;
  breakEnd: string | null;
};

/** A shop-wide closure, as UTC instants (ISO). */
export type CalendarClosure = { startsAt: string; endsAt: string; reason: string | null };

/** A stretch of one day, in minutes after Manila midnight. */
export type DaySpan = { startMin: number; endMin: number; label: string };

/** The day's opening hours and break, or null when the shop doesn't open that weekday. */
export function hoursOn(
  hours: WeekdayHours[],
  key: string,
): { opensMin: number; closesMin: number; breakSpan: DaySpan | null } | null {
  const row = hours.find((h) => h.weekday === weekdayOf(key));
  if (!row) return null;
  return {
    opensMin: timeToMinutes(row.opens),
    closesMin: timeToMinutes(row.closes),
    breakSpan:
      row.breakStart && row.breakEnd
        ? {
            startMin: timeToMinutes(row.breakStart),
            endMin: timeToMinutes(row.breakEnd),
            label: "Break",
          }
        : null,
  };
}

/** The parts of a day that closures cover. */
export function closuresOn(closures: CalendarClosure[], key: string): DaySpan[] {
  const dayStart = manilaToUtc(key, "00:00").getTime();
  const dayEnd = manilaToUtc(addDays(key, 1), "00:00").getTime();
  const spans: DaySpan[] = [];
  for (const c of closures) {
    const start = new Date(c.startsAt).getTime();
    const end = new Date(c.endsAt).getTime();
    if (end <= dayStart || start >= dayEnd) continue;
    spans.push({
      startMin: start <= dayStart ? 0 : manilaMinutes(start),
      endMin: end >= dayEnd ? 24 * 60 : manilaMinutes(end),
      label: c.reason ? `Closed: ${c.reason}` : "Closed",
    });
  }
  return spans;
}

/** Whether a closure covers the whole of the day's opening hours (or the whole day). */
export function closedAllDay(
  spans: DaySpan[],
  open: { opensMin: number; closesMin: number } | null,
) {
  const from = open?.opensMin ?? 0;
  const to = open?.closesMin ?? 24 * 60;
  return spans.some((s) => s.startMin <= from && s.endMin >= to);
}

/**
 * The hours the week grid draws: from the earliest opening to the latest
 * closing, widened to fit every booking shown, 8 AM to 8 PM when nothing is set.
 */
export function hourRange(
  hours: WeekdayHours[],
  bookings: BookingListItem[],
): { startHour: number; endHour: number } {
  let startMin = Infinity;
  let endMin = -Infinity;
  for (const h of hours) {
    startMin = Math.min(startMin, timeToMinutes(h.opens));
    endMin = Math.max(endMin, timeToMinutes(h.closes));
  }
  for (const b of bookings) {
    const start = manilaMinutes(b.startAt);
    startMin = Math.min(startMin, start);
    const end =
      manilaDate(bookingEndMs(b)) === manilaDate(b.startAt)
        ? manilaMinutes(bookingEndMs(b))
        : 24 * 60;
    endMin = Math.max(endMin, end);
  }
  if (!Number.isFinite(startMin)) startMin = 8 * 60;
  if (!Number.isFinite(endMin)) endMin = 20 * 60;
  const startHour = Math.max(0, Math.floor(startMin / 60));
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(endMin / 60)));
  return { startHour, endHour };
}

// ---------------------------------------------------------------------------
// Bookings on the grid
// ---------------------------------------------------------------------------

export function groupByDay(bookings: BookingListItem[]): Map<string, BookingListItem[]> {
  const map = new Map<string, BookingListItem[]>();
  for (const b of bookings) {
    const key = manilaDate(b.startAt);
    const list = map.get(key);
    if (list) list.push(b);
    else map.set(key, [b]);
  }
  for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return map;
}

const DID_NOT_HAPPEN = new Set(["cancelled", "declined", "expired"]);

/** Cancelled, declined or expired: hidden unless asked for, struck through when shown. */
export function isCancelled(booking: Pick<BookingListItem, "status">): boolean {
  return DID_NOT_HAPPEN.has(booking.status);
}

export type StaffFilter = "all" | "unassigned" | (string & {});

export function filterBookings(
  bookings: BookingListItem[],
  staff: StaffFilter,
  showCancelled: boolean,
): BookingListItem[] {
  return bookings.filter((b) => {
    if (!showCancelled && isCancelled(b)) return false;
    if (staff === "all") return true;
    if (staff === "unassigned") return b.staffId === null;
    return b.staffId === staff;
  });
}

/** A booking placed in its day column: minutes from midnight and its lane. */
export type PlacedBooking = {
  booking: BookingListItem;
  startMin: number;
  endMin: number;
  /** Its lane (0-based) among the bookings it overlaps. */
  lane: number;
  /** How many lanes its group of overlapping bookings needs. */
  lanes: number;
};

/** Shorter bookings still take this much room, so they can be read and tapped. */
export const MIN_BLOCK_MIN = 20;

/**
 * Lays out one day's bookings side by side where they overlap: each group of
 * bookings that overlap one another shares its width among as few lanes as fit.
 */
export function layoutDay(bookings: BookingListItem[]): PlacedBooking[] {
  const items = bookings
    .map((booking) => {
      const startMin = manilaMinutes(booking.startAt);
      const sameDay = manilaDate(bookingEndMs(booking)) === manilaDate(booking.startAt);
      const realEnd = sameDay ? manilaMinutes(bookingEndMs(booking)) : 24 * 60;
      const endMin = Math.min(24 * 60, Math.max(realEnd, startMin + MIN_BLOCK_MIN));
      return { booking, startMin, endMin, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const placed: PlacedBooking[] = [];
  let group: PlacedBooking[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const item of group) item.lanes = laneEnds.length;
    placed.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of items) {
    if (item.startMin >= groupEnd && group.length > 0) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    item.lane = lane;
    group.push(item);
    groupEnd = group.length === 1 ? item.endMin : Math.max(groupEnd, item.endMin);
  }
  if (group.length > 0) closeGroup();
  return placed;
}

/** Counts for the header line and a day cell. */
export function summarize(bookings: BookingListItem[]): { total: number; toAnswer: number } {
  let total = 0;
  let toAnswer = 0;
  for (const b of bookings) {
    if (isCancelled(b)) continue;
    total += 1;
    if (b.status === "requested") toAnswer += 1;
  }
  return { total, toAnswer };
}
