import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// The database and APIs use UTC instants. Convert to Manila wall-clock time
// only through these helpers, never with the machine's local time zone.

export const TIME_ZONE = "Asia/Manila";

type Instant = Date | string | number;

/** Formats an instant in Manila time, for example "Sun, Dec 6 · 2:30 PM". */
export function formatManila(instant: Instant, pattern = "EEE, MMM d · h:mm a"): string {
  return formatInTimeZone(instant, TIME_ZONE, pattern);
}

/** Formats Manila time only, e.g. "2:30 PM". */
export function formatManilaTime(instant: Instant): string {
  return formatInTimeZone(instant, TIME_ZONE, "h:mm a");
}

/** The Manila calendar date of an instant, as "yyyy-MM-dd". */
export function manilaDate(instant: Instant): string {
  return formatInTimeZone(instant, TIME_ZONE, "yyyy-MM-dd");
}

/** The Manila day of the week, 0 = Sunday … 6 = Saturday (as in business_hours). */
export function manilaWeekday(instant: Instant): number {
  return Number(formatInTimeZone(instant, TIME_ZONE, "i")) % 7;
}

/** The UTC instant of a Manila date and wall-clock time ("2026-12-06", "14:30", "23:59:59.999"). */
export function manilaToUtc(date: string, time = "00:00"): Date {
  const parts = time.split(":");
  const normalizedTime = parts.length === 2 ? `${time}:00` : time;
  return fromZonedTime(`${date}T${normalizedTime}`, TIME_ZONE);
}

/** The UTC instant at which the Manila day containing `instant` starts. */
export function startOfManilaDay(instant: Instant): Date {
  return manilaToUtc(manilaDate(instant));
}

/** Formats a Manila calendar date, e.g. "Dec 6, 2026". */
export function formatDate(instant: Instant, pattern = "MMM d, yyyy"): string {
  return formatInTimeZone(instant, TIME_ZONE, pattern);
}

/** Formats date and time in Manila time, e.g. "Dec 6, 2026 · 2:30 PM". */
export function formatDateTime(instant: Instant, pattern = "MMM d, yyyy · h:mm a"): string {
  return formatInTimeZone(instant, TIME_ZONE, pattern);
}

/** Formats a human-friendly relative time, e.g. "5m ago", "2h ago". */
export function formatTimeAgo(instant: Instant): string {
  const diffMs = Date.now() - new Date(instant).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(instant);
}

/** True for a real "yyyy-MM-dd" calendar date (rejects "2026-02-30"). */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Formats two Manila calendar dates ("yyyy-MM-dd") as one range, naming the
 * month and year only once when they repeat: "Nov 3–21, 2026",
 * "Oct 1 – Nov 21, 2026", "Dec 1, 2026 – Jul 31, 2027".
 */
export function formatManilaDateRange(from: string, to: string): string {
  const start = manilaToUtc(from, "12:00");
  const end = manilaToUtc(to, "12:00");
  if (from === to) return formatDate(start);
  if (from.slice(0, 4) !== to.slice(0, 4)) return `${formatDate(start)} – ${formatDate(end)}`;
  if (from.slice(0, 7) !== to.slice(0, 7)) {
    return `${formatDate(start, "MMM d")} – ${formatDate(end)}`;
  }
  return `${formatDate(start, "MMM d")}–${formatDate(end, "d, yyyy")}`;
}
