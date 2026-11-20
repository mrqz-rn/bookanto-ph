// The shop's Today screen as pure functions over plain values: what's next,
// how long a request has left, where "now" sits in the day and what the
// opening hours say right now. Browser-safe; instants are ISO strings or ms.

import { formatManilaTime } from "@/lib/time";
import type { BookingListItem, TodayHours } from "./constants";
import { canShopAccept, canShopComplete, canShopMarkNoShow, type Verdict } from "./rules";

const MINUTE = 60_000;

export type TodayFilter = "all" | "todo" | "finished" | "walk_ins";

const TODO = new Set(["requested", "confirmed"]);
const FINISHED = new Set(["completed", "no_show"]);
/** Bookings that no longer happen today: shown in All, dimmed, never counted as to do. */
const CLOSED = new Set(["completed", "no_show", "cancelled", "declined", "expired"]);

export function isClosed(booking: Pick<BookingListItem, "status">): boolean {
  return CLOSED.has(booking.status);
}

export function matchesFilter(booking: BookingListItem, filter: TodayFilter): boolean {
  if (filter === "todo") return TODO.has(booking.status);
  if (filter === "finished") return FINISHED.has(booking.status);
  if (filter === "walk_ins") return booking.isWalkIn;
  return true;
}

export function countFor(bookings: BookingListItem[], filter: TodayFilter): number {
  return bookings.filter((b) => matchesFilter(b, filter)).length;
}

/** When a booking ends: its end time, else its start plus the service length. */
export function bookingEndMs(booking: BookingListItem): number {
  if (booking.endAt) return new Date(booking.endAt).getTime();
  return new Date(booking.startAt).getTime() + booking.serviceDurationMin * MINUTE;
}

export type UpNext = { booking: BookingListItem; inProgress: boolean; startsInMs: number };

/** The confirmed booking happening now, else the next one today. */
export function pickUpNext(bookings: BookingListItem[], nowMs: number): UpNext | null {
  const next = bookings
    .filter((b) => b.status === "confirmed" && bookingEndMs(b) > nowMs)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  if (!next) return null;
  const startsInMs = new Date(next.startAt).getTime() - nowMs;
  return { booking: next, inProgress: startsInMs <= 0, startsInMs };
}

/** "1 h 12 min", "8 min", "under a minute". */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / MINUTE);
  if (totalMin < 1) return "under a minute";
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export type RequestDeadline = { label: string; urgent: boolean; lapsed: boolean };

/** How long the shop has left to answer a request. Urgent under 15 minutes. */
export function requestDeadline(
  booking: Pick<BookingListItem, "expiresAt">,
  nowMs: number,
): RequestDeadline | null {
  if (!booking.expiresAt) return null;
  const left = new Date(booking.expiresAt).getTime() - nowMs;
  if (left <= 0) return { label: "Time to answer has run out", urgent: true, lapsed: true };
  return {
    label: `Answer within ${formatDuration(left)}`,
    urgent: left < 15 * MINUTE,
    lapsed: false,
  };
}

// The same rules the server checks (rules.ts), so a button only shows when it would work.
function shopSide(booking: BookingListItem) {
  return {
    status: booking.status,
    bookingType: booking.bookingType ?? "slot",
    startAt: new Date(booking.startAt),
    expiresAt: booking.expiresAt ? new Date(booking.expiresAt) : null,
  };
}

export function acceptVerdict(booking: BookingListItem, nowMs: number): Verdict {
  return canShopAccept(shopSide(booking), new Date(nowMs));
}

export function canCompleteAt(booking: BookingListItem, nowMs: number): boolean {
  return canShopComplete(shopSide(booking), new Date(nowMs)).allowed;
}

export function canMarkNoShowAt(booking: BookingListItem, nowMs: number): boolean {
  return canShopMarkNoShow(shopSide(booking), new Date(nowMs)).allowed;
}

export function isQuoteRequest(booking: BookingListItem): boolean {
  return booking.status === "requested" && booking.bookingType === "quote";
}

/** Index in the list before which the "Now" line goes, or -1 when it doesn't belong. */
export function nowLineIndex(bookings: BookingListItem[], nowMs: number): number {
  if (bookings.length === 0) return -1;
  const index = bookings.findIndex((b) => new Date(b.startAt).getTime() > nowMs);
  return index === -1 ? bookings.length : index;
}

/** One line on the opening hours, for the header: "Open until 7:00 PM". */
export function hoursLine(hours: TodayHours | null | undefined, nowMs: number): string | null {
  if (hours === undefined) return null;
  if (hours === null) return "Closed today";
  if (hours.closedReason !== null) {
    return hours.closedReason ? `Closed today: ${hours.closedReason}` : "Closed today";
  }
  const opens = new Date(hours.opensAt).getTime();
  const closes = new Date(hours.closesAt).getTime();
  if (nowMs < opens) return `Opens at ${formatManilaTime(hours.opensAt)}`;
  if (nowMs >= closes) return `Closed at ${formatManilaTime(hours.closesAt)}`;
  if (hours.breakStartAt && hours.breakEndAt) {
    const breakStart = new Date(hours.breakStartAt).getTime();
    const breakEnd = new Date(hours.breakEndAt).getTime();
    if (nowMs >= breakStart && nowMs < breakEnd) {
      return `On break until ${formatManilaTime(hours.breakEndAt)}`;
    }
  }
  return `Open until ${formatManilaTime(hours.closesAt)}`;
}

/** First name for the call button: "Call Maria". */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
