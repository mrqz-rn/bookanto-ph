// Browser-safe values shared by the availability engine, schemas and UI.

/** Wall-clock time as stored in business_hours, "HH:MM" (24-hour). */
export const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Slots start every 30 minutes from the opening time (and from the end of a break). */
export const SLOT_STEP_MIN = 30;
/** A slot must start at least this long from now, so the shop has time to see it. */
export const MIN_NOTICE_MIN = 30;
/** How far ahead customers can book. */
export const BOOKING_HORIZON_DAYS = 60;
/** The most days one getOpenSlots call returns (a two-week date strip). */
export const MAX_SLOT_DAYS = 14;
/** Longest single closure or time-off entry. */
export const MAX_CLOSURE_DAYS = 90;

/** Booking statuses that hold a slot. Quoted holds it until the quote expires. */
export const SLOT_HOLDING_STATUSES = ["requested", "quoted", "confirmed"] as const;

/** Week shown Monday first, as Filipino shops write their hours. 0 = Sunday, as in business_hours. */
export const WEEKDAYS = [
  { weekday: 1, label: "Monday", short: "Mon" },
  { weekday: 2, label: "Tuesday", short: "Tue" },
  { weekday: 3, label: "Wednesday", short: "Wed" },
  { weekday: 4, label: "Thursday", short: "Thu" },
  { weekday: 5, label: "Friday", short: "Fri" },
  { weekday: 6, label: "Saturday", short: "Sat" },
  { weekday: 0, label: "Sunday", short: "Sun" },
] as const;

export type DayHours = {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  opens: string;
  closes: string;
  breakStart: string | null;
  breakEnd: string | null;
};

/** Minutes since midnight of an "HH:MM" time. */
export function clockToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** "13:30" → "1:30 PM". */
export function formatClock(time: string): string {
  const total = clockToMinutes(time);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * Why a day's hours are invalid, or null when they're fine. Shared by the Zod
 * schema and the editor, so the form flags problems before saving.
 */
export function dayHoursProblem(day: Omit<DayHours, "weekday">): string | null {
  const { opens, closes, breakStart, breakEnd } = day;
  if (!CLOCK_TIME.test(opens) || !CLOCK_TIME.test(closes))
    return "Enter opening and closing times.";
  if (closes <= opens) return "Closing time must be after opening time.";
  if (!breakStart && !breakEnd) return null;
  if (!breakStart || !breakEnd || !CLOCK_TIME.test(breakStart) || !CLOCK_TIME.test(breakEnd)) {
    return "Enter both break times, or remove the break.";
  }
  if (breakEnd <= breakStart) return "The break must end after it starts.";
  if (breakStart <= opens || breakEnd >= closes) {
    return "The break must start after opening and end before closing.";
  }
  return null;
}
