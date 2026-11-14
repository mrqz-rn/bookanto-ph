import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// The database and APIs use UTC instants. Convert to Manila wall-clock time
// only through these helpers, never with the machine's local time zone.

export const TIME_ZONE = "Asia/Manila";

type Instant = Date | string | number;

/** Formats an instant in Manila time, for example "Sun, Dec 6 · 2:30 PM". */
export function formatManila(instant: Instant, pattern = "EEE, MMM d · h:mm a"): string {
  return formatInTimeZone(instant, TIME_ZONE, pattern);
}

/** The Manila calendar date of an instant, as "yyyy-MM-dd". */
export function manilaDate(instant: Instant): string {
  return formatInTimeZone(instant, TIME_ZONE, "yyyy-MM-dd");
}

/** The Manila day of the week, 0 = Sunday … 6 = Saturday (as in business_hours). */
export function manilaWeekday(instant: Instant): number {
  return Number(formatInTimeZone(instant, TIME_ZONE, "i")) % 7;
}

/** The UTC instant of a Manila date and wall-clock time ("2026-12-06", "14:30"). */
export function manilaToUtc(date: string, time = "00:00"): Date {
  return fromZonedTime(`${date}T${time}:00`, TIME_ZONE);
}

/** The UTC instant at which the Manila day containing `instant` starts. */
export function startOfManilaDay(instant: Instant): Date {
  return manilaToUtc(manilaDate(instant));
}
