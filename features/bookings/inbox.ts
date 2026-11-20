// The shop's booking inbox as pure functions over plain values: which view a
// booking belongs to, how a view is sorted and grouped by Manila day, and the
// search. Browser-safe; instants are ISO strings or ms.

import { formatManila, manilaDate } from "@/lib/time";
import type { BookingListItem } from "./constants";
import { FINAL_STATUSES } from "./rules";

const DAY = 86_400_000;

export type InboxView = "requests" | "upcoming" | "past";

export const INBOX_VIEWS: Array<{ id: InboxView; label: string }> = [
  { id: "requests", label: "Requests" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const FINAL = new Set<string>(FINAL_STATUSES);

/** Requests wait on someone (the shop, or the customer for a quote); upcoming are confirmed; past are final. */
export function viewOf(booking: Pick<BookingListItem, "status">): InboxView {
  if (booking.status === "confirmed") return "upcoming";
  if (FINAL.has(booking.status)) return "past";
  return "requests";
}

/** The view to open on: requests when any wait, else what's coming up. */
export function initialView(bookings: BookingListItem[]): InboxView {
  return bookings.some((b) => viewOf(b) === "requests") ? "requests" : "upcoming";
}

export type InboxFilters = { search: string; staffId: string };

export function matchesFilters(booking: BookingListItem, filters: InboxFilters): boolean {
  if (filters.staffId !== "all") {
    if (filters.staffId === "none" ? booking.staffId !== null : booking.staffId !== filters.staffId)
      return false;
  }
  const query = filters.search.trim().toLowerCase();
  if (!query) return true;
  return [booking.customerName, booking.serviceName, booking.refCode, booking.notes ?? ""].some(
    (field) => field.toLowerCase().includes(query),
  );
}

export function countByView(bookings: BookingListItem[]): Record<InboxView, number> {
  const counts: Record<InboxView, number> = { requests: 0, upcoming: 0, past: 0 };
  for (const booking of bookings) counts[viewOf(booking)] += 1;
  return counts;
}

export type DayGroup = {
  /** "yyyy-MM-dd" in Manila, or "overdue" for confirmed bookings from before today. */
  key: string;
  title: string;
  /** The weekday and date beside a relative title ("Thu, Nov 20" beside "Today"). */
  date: string | null;
  bookings: BookingListItem[];
};

const start = (b: BookingListItem) => new Date(b.startAt).getTime();

/** "Today", "Tomorrow", "Yesterday" or null for a Manila date relative to now. */
function relativeDay(date: string, nowMs: number): string | null {
  if (date === manilaDate(nowMs)) return "Today";
  if (date === manilaDate(nowMs + DAY)) return "Tomorrow";
  if (date === manilaDate(nowMs - DAY)) return "Yesterday";
  return null;
}

function dayLabel(instant: string, nowMs: number): string {
  const sameYear = manilaDate(instant).slice(0, 4) === manilaDate(nowMs).slice(0, 4);
  return formatManila(instant, sameYear ? "EEE, MMM d" : "EEE, MMM d, yyyy");
}

/**
 * One view's bookings, sorted and grouped by the Manila day they happen.
 * Requests and upcoming run soonest first; past runs latest first. Upcoming
 * puts confirmed bookings from before today in one group at the top, since
 * they still need marking done or no-show.
 */
export function groupByDay(
  bookings: BookingListItem[],
  view: InboxView,
  nowMs: number,
): DayGroup[] {
  const sorted = bookings
    .filter((b) => viewOf(b) === view)
    .sort((a, b) => (view === "past" ? start(b) - start(a) : start(a) - start(b)));

  const today = manilaDate(nowMs);
  const groups: DayGroup[] = [];
  for (const booking of sorted) {
    const date = manilaDate(booking.startAt);
    const overdue = view === "upcoming" && date < today;
    const key = overdue ? "overdue" : date;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const relative = overdue ? null : relativeDay(date, nowMs);
      group = overdue
        ? { key, title: "Still to mark", date: null, bookings: [] }
        : {
            key,
            title: relative ?? dayLabel(booking.startAt, nowMs),
            date: relative ? dayLabel(booking.startAt, nowMs) : null,
            bookings: [],
          };
      groups.push(group);
    }
    group.bookings.push(booking);
  }
  return groups;
}

/** The header's one line of facts: "2 requests to answer · 5 confirmed bookings coming up". */
export function summaryLine(bookings: BookingListItem[], nowMs: number): string {
  const toAnswer = bookings.filter((b) => b.status === "requested").length;
  const comingUp = bookings.filter(
    (b) => b.status === "confirmed" && manilaDate(b.startAt) >= manilaDate(nowMs),
  ).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const requests =
    toAnswer === 0 ? "No requests waiting" : plural(toAnswer, "request", "requests") + " to answer";
  const upcoming =
    comingUp === 0
      ? "no confirmed bookings"
      : plural(comingUp, "confirmed booking", "confirmed bookings");
  return `${requests} · ${upcoming} coming up`;
}
