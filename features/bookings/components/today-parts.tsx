"use client";

import Link from "next/link";
import { Loader2, Phone, Plus, Store, Timer, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_CONFIG, type BookingListItem } from "../constants";
import {
  acceptVerdict,
  bookingEndMs,
  canCompleteAt,
  canMarkNoShowAt,
  countFor,
  firstName,
  formatDuration,
  isClosed,
  isQuoteRequest,
  matchesFilter,
  nowLineIndex,
  requestDeadline,
  type TodayFilter,
  type UpNext,
} from "../today";
import { BookingStatusBadge } from "./booking-status-badge";
import { Busy, PRESS } from "./booking-ui";

// The pieces of the shop's Today screen. State and server calls live in
// today-view.tsx; these only draw.

const CARD = "rounded-2xl border border-border bg-white";

function priceLabel(booking: BookingListItem) {
  return booking.totalCentavos !== null ? formatPeso(booking.totalCentavos) : "Quote";
}

function timeRange(booking: BookingListItem) {
  return `${formatManilaTime(booking.startAt)} to ${formatManilaTime(new Date(bookingEndMs(booking)))}`;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function TodayHeader({
  dateLabel,
  hoursText,
  accepting,
  toggling,
  offline,
  onToggleAccepting,
  onAddWalkIn,
  installButton,
}: {
  dateLabel: string;
  hoursText: string | null;
  accepting: boolean;
  toggling: boolean;
  offline: boolean;
  onToggleAccepting: () => void;
  onAddWalkIn: () => void;
  installButton?: React.ReactNode;
}) {
  const closed = hoursText?.startsWith("Closed") ?? false;
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">Today</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-base text-slate-600">
          <span>{dateLabel}</span>
          {hoursText && (
            <>
              <span aria-hidden className="text-slate-400">
                ·
              </span>
              <span className={cn("font-semibold", closed ? "text-slate-600" : "text-green-700")}>
                {hoursText}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          role="switch"
          aria-checked={accepting}
          aria-label="Take new bookings today"
          disabled={toggling || offline}
          onClick={onToggleAccepting}
          className={cn(
            "inline-flex h-11 items-center justify-between gap-3 rounded-full border border-border bg-white py-1 pr-1.5 pl-4 text-sm font-semibold text-navy-900 transition-colors hover:bg-neutral-50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60",
          )}
        >
          <span aria-hidden>{accepting ? "Taking bookings" : "Bookings paused"}</span>
          <span
            aria-hidden
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              accepting ? "bg-green-600" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-white shadow-sm transition-transform",
                accepting && "translate-x-5",
              )}
            >
              {toggling && <Loader2 className="size-3 animate-spin text-slate-500" />}
            </span>
          </span>
        </button>

        <Button type="button" onClick={onAddWalkIn} className={cn("w-full sm:w-auto", PRESS)}>
          <Plus aria-hidden />
          Add walk-in
        </Button>

        {installButton}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export function OfflineNotice() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-yellow-400 bg-cream-50 p-4 text-sm text-navy-900"
    >
      <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
      <p>
        <span className="font-semibold">You&apos;re offline.</span> This is the schedule saved on
        this phone. You can still call clients; accepting and marking bookings works again once
        you&apos;re back online.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requests to answer
// ---------------------------------------------------------------------------

type RowActions = {
  busyId: string | null;
  offline: boolean;
  onAccept: (id: string) => void;
  onDecline: (booking: BookingListItem) => void;
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onOpen: (booking: BookingListItem) => void;
};

export function RequestsPanel({
  requests,
  nowMs,
  actions,
}: {
  requests: BookingListItem[];
  nowMs: number;
  actions: RowActions;
}) {
  return (
    <section
      aria-labelledby="today-requests"
      className="rounded-2xl border border-yellow-400 bg-cream-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2
          id="today-requests"
          className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"
        >
          Requests to answer
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-yellow-400 px-2 font-sans text-sm font-bold text-navy-900 tabular-nums">
            {requests.length}
          </span>
        </h2>
        <p className="text-sm text-slate-600">A request you don&apos;t answer expires.</p>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} nowMs={nowMs} actions={actions} />
        ))}
      </ul>
    </section>
  );
}

function RequestCard({
  request,
  nowMs,
  actions,
}: {
  request: BookingListItem;
  nowMs: number;
  actions: RowActions;
}) {
  const deadline = requestDeadline(request, nowMs);
  const verdict = acceptVerdict(request, nowMs);
  const busy = actions.busyId === request.id;
  return (
    <li className={cn(CARD, "flex flex-col p-4")}>
      <button
        type="button"
        onClick={() => actions.onOpen(request)}
        className="-m-2 flex items-start justify-between gap-3 rounded-xl p-2 text-left transition-colors hover:bg-neutral-50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-600 tabular-nums">
            {timeRange(request)}
          </span>
          <span className="mt-0.5 block truncate text-base font-semibold text-navy-900">
            {request.serviceName}
          </span>
          <span className="block truncate text-sm text-slate-600">{request.customerName}</span>
        </span>
        <span className="shrink-0 font-display text-lg font-bold text-navy-900 tabular-nums">
          {priceLabel(request)}
        </span>
      </button>

      {deadline && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 text-sm font-semibold",
            deadline.urgent ? "text-danger" : "text-warning",
          )}
        >
          <Timer aria-hidden className="size-4" />
          {deadline.label}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {isQuoteRequest(request) ? (
          <Button asChild className={cn("col-span-2", PRESS)}>
            <Link href="/dashboard/quotes">Send a quote</Link>
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy || actions.offline}
              onClick={() => actions.onDecline(request)}
              className={PRESS}
            >
              Decline
            </Button>
            <Button
              type="button"
              disabled={busy || actions.offline || !verdict.allowed}
              onClick={() => actions.onAccept(request.id)}
              className={PRESS}
            >
              <Busy busy={busy}>Accept</Busy>
            </Button>
            {!verdict.allowed && (
              <p className="col-span-2 text-sm text-slate-600">{verdict.reason}</p>
            )}
          </>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Up next
// ---------------------------------------------------------------------------

export function UpNextCard({
  upNext,
  hasBookings,
  nowMs,
  actions,
}: {
  upNext: UpNext | null;
  hasBookings: boolean;
  nowMs: number;
  actions: RowActions;
}) {
  const booking = upNext?.booking;
  const busy = booking ? actions.busyId === booking.id : false;
  return (
    <section aria-labelledby="today-up-next" className={cn(CARD, "p-5")}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-up-next" className="font-display text-xl font-bold text-navy-900">
          Up next
        </h2>
        {upNext && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              upNext.inProgress ? "bg-green-600 text-white" : "bg-accent text-green-800",
            )}
          >
            {upNext.inProgress ? "In progress" : `Starts in ${formatDuration(upNext.startsInMs)}`}
          </span>
        )}
      </div>

      {booking ? (
        <>
          <button
            type="button"
            onClick={() => actions.onOpen(booking)}
            className="-mx-2 mt-3 block w-[calc(100%+1rem)] rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-50"
          >
            <span className="block font-display text-3xl font-bold text-navy-900 tabular-nums">
              {formatManilaTime(booking.startAt)}
            </span>
            <span className="block text-sm text-slate-600 tabular-nums">
              until {formatManilaTime(new Date(bookingEndMs(booking)))}
            </span>
            <span className="mt-3 block text-lg font-semibold text-navy-900">
              {booking.serviceName}
            </span>
            <span className="block text-base text-slate-600">
              {booking.customerName}
              {booking.staffName && ` · with ${booking.staffName}`}
            </span>
            {booking.notes && !booking.isWalkIn && (
              <span className="mt-3 line-clamp-3 block rounded-lg bg-muted p-3 text-sm text-navy-900">
                {booking.notes}
              </span>
            )}
          </button>

          <div className="mt-4 grid gap-2">
            {canCompleteAt(booking, nowMs) && (
              <Button
                type="button"
                disabled={busy || actions.offline}
                onClick={() => actions.onComplete(booking.id)}
                className={PRESS}
              >
                <Busy busy={busy}>Mark done</Busy>
              </Button>
            )}
            {booking.customerPhone && (
              <Button asChild variant="outline" className={PRESS}>
                <a href={`tel:${booking.customerPhone}`}>
                  <Phone aria-hidden />
                  Call {firstName(booking.customerName)}
                </a>
              </Button>
            )}
            {canMarkNoShowAt(booking, nowMs) && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy || actions.offline}
                onClick={() => actions.onNoShow(booking.id)}
                className="text-slate-600"
              >
                Mark as no-show
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-base text-slate-600">
          {hasBookings
            ? "No more confirmed bookings today."
            : "Nothing booked yet. Your next confirmed booking shows here."}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Today so far
// ---------------------------------------------------------------------------

export function DaySummary({ bookings }: { bookings: BookingListItem[] }) {
  const planned = bookings.filter((b) => !["cancelled", "declined", "expired"].includes(b.status));
  const done = planned.filter((b) => b.status === "completed");
  const sum = (list: BookingListItem[]) => list.reduce((t, b) => t + (b.totalCentavos ?? 0), 0);
  const earned = sum(done);
  const toCome = sum(planned.filter((b) => b.status === "confirmed" || b.status === "requested"));
  const walkIns = planned.filter((b) => b.isWalkIn).length;
  const noShows = planned.filter((b) => b.status === "no_show").length;
  const share = planned.length === 0 ? 0 : Math.round((done.length / planned.length) * 100);

  const figures = [
    { label: "Earned", value: formatPeso(earned) },
    { label: "Still to come", value: formatPeso(toCome) },
    { label: "Walk-ins", value: String(walkIns) },
    { label: "No-shows", value: String(noShows) },
  ];

  return (
    <section aria-labelledby="today-summary" className={cn(CARD, "p-5")}>
      <h2 id="today-summary" className="font-display text-xl font-bold text-navy-900">
        Today so far
      </h2>
      <div className="mt-4">
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-navy-900">
            {planned.length === 0
              ? "No bookings yet"
              : `${done.length} of ${planned.length} ${planned.length === 1 ? "booking" : "bookings"} done`}
          </span>
          {planned.length > 0 && <span className="text-slate-600 tabular-nums">{share}%</span>}
        </p>
        <div
          role="progressbar"
          aria-label="Bookings done"
          aria-valuemin={0}
          aria-valuemax={planned.length}
          aria-valuenow={done.length}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-green-600 transition-[width] duration-500"
            style={{ width: `${share}%` }}
          />
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt className="text-sm text-slate-600">{figure.label}</dt>
            <dd className="font-display text-2xl font-bold text-navy-900 tabular-nums">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

const FILTERS: Array<{ id: TodayFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "todo", label: "To do" },
  { id: "finished", label: "Finished" },
  { id: "walk_ins", label: "Walk-ins" },
];

const EMPTY_FILTER: Record<TodayFilter, string> = {
  all: "",
  todo: "Nothing left to do today.",
  finished: "No finished bookings yet today.",
  walk_ins: "No walk-ins yet today.",
};

export function ScheduleCard({
  bookings,
  filter,
  onFilter,
  nowMs,
  isToday,
  actions,
  onAddWalkIn,
  shopSlug,
  className,
}: {
  bookings: BookingListItem[];
  filter: TodayFilter;
  onFilter: (filter: TodayFilter) => void;
  nowMs: number;
  /** False for a schedule saved on another day (offline): no "Now" line. */
  isToday: boolean;
  actions: RowActions;
  onAddWalkIn: () => void;
  shopSlug: string | null;
  className?: string;
}) {
  const shown = bookings.filter((b) => matchesFilter(b, filter));
  const nowAt = isToday && filter === "all" ? nowLineIndex(shown, nowMs) : -1;
  const reserveActions = shown.some((b) => rowHasActions(b, nowMs));

  return (
    <section aria-labelledby="today-schedule" className={cn(CARD, "overflow-hidden", className)}>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <h2 id="today-schedule" className="font-display text-xl font-bold text-navy-900">
          Schedule
        </h2>
        {bookings.length > 0 && (
          <div role="group" aria-label="Show bookings" className="flex flex-wrap gap-1.5">
            {FILTERS.map(({ id, label }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilter(id)}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
                    active
                      ? "bg-navy-900 text-white"
                      : "bg-muted text-slate-600 hover:bg-neutral-200 hover:text-navy-900",
                  )}
                >
                  {label}
                  <span className={cn("tabular-nums", active ? "text-white/70" : "text-slate-400")}>
                    {countFor(bookings, id)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="px-5 py-12 text-center sm:py-16">
          <h3 className="font-display text-xl font-bold text-navy-900">No bookings yet today</h3>
          <p className="mx-auto mt-2 max-w-sm text-base text-slate-600">
            Requests from your shop page and walk-ins you add show up here as the day goes.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" onClick={onAddWalkIn} className={PRESS}>
              <Plus aria-hidden />
              Add walk-in
            </Button>
            {shopSlug && (
              <Button asChild variant="outline" className={PRESS}>
                <Link href={`/shop/${shopSlug}`} target="_blank">
                  <Store aria-hidden />
                  Open your shop page
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-base text-slate-600">{EMPTY_FILTER[filter]}</p>
      ) : (
        <ol className="divide-y divide-border">
          {shown.map((booking, index) => (
            <ScheduleEntry
              key={booking.id}
              booking={booking}
              nowMs={nowMs}
              actions={actions}
              nowLineBefore={index === nowAt}
              reserveActions={reserveActions}
            />
          ))}
          {nowAt === shown.length && <NowLine nowMs={nowMs} />}
        </ol>
      )}
    </section>
  );
}

function NowLine({ nowMs }: { nowMs: number }) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-2 sm:px-5" aria-label="Current time">
      <span className="w-16 shrink-0 text-xs font-bold text-green-700 tabular-nums sm:w-20">
        {formatManilaTime(new Date(nowMs))}
      </span>
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-green-600" />
      <span aria-hidden className="h-0.5 flex-1 rounded-full bg-green-600" />
      <span className="text-xs font-bold tracking-wide text-green-700 uppercase">Now</span>
    </li>
  );
}

/** Whether a schedule row gets any buttons right now. */
function rowHasActions(booking: BookingListItem, nowMs: number): boolean {
  return (
    isQuoteRequest(booking) ||
    (booking.status === "requested" && acceptVerdict(booking, nowMs).allowed) ||
    canCompleteAt(booking, nowMs) ||
    canMarkNoShowAt(booking, nowMs)
  );
}

function ScheduleEntry({
  booking,
  nowMs,
  actions,
  nowLineBefore,
  reserveActions,
}: {
  booking: BookingListItem;
  nowMs: number;
  actions: RowActions;
  nowLineBefore: boolean;
  /** Keep the actions column even when this row has none, so prices line up. */
  reserveActions: boolean;
}) {
  const closed = isClosed(booking);
  // Cancelled, declined and expired didn't happen: struck through. Done and no-show are only muted.
  const struck = closed && booking.status !== "completed" && booking.status !== "no_show";
  const busy = actions.busyId === booking.id;
  const dot = BOOKING_STATUS_CONFIG[booking.status]?.dotClass ?? "bg-slate-400";
  const canAccept = booking.status === "requested" && acceptVerdict(booking, nowMs).allowed;
  const canComplete = canCompleteAt(booking, nowMs);
  const canNoShow = canMarkNoShowAt(booking, nowMs);
  const hasActions = rowHasActions(booking, nowMs);

  return (
    <>
      {nowLineBefore && <NowLine nowMs={nowMs} />}
      <li
        className={cn(
          "flex flex-col gap-3 p-4 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
          closed && "text-slate-600",
        )}
      >
        <button
          type="button"
          onClick={() => actions.onOpen(booking)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left"
        >
          <span className="w-16 shrink-0 pt-0.5 sm:w-20">
            <span
              className={cn(
                "block text-sm font-bold tabular-nums",
                closed ? "text-slate-500" : "text-navy-900",
              )}
            >
              {formatManilaTime(booking.startAt)}
            </span>
            <span className="block text-xs text-slate-500 tabular-nums">
              {formatManilaTime(new Date(bookingEndMs(booking)))}
            </span>
          </span>
          <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dot)} />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-base font-semibold",
                closed ? "text-slate-600" : "text-navy-900",
                struck && "line-through decoration-slate-400",
              )}
            >
              {booking.serviceName}
            </span>
            <span className="block truncate text-sm text-slate-600">
              {booking.customerName}
              {booking.staffName && ` · ${booking.staffName}`}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <BookingStatusBadge status={booking.status} />
              {booking.isWalkIn && (
                <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-semibold text-navy-900">
                  Walk-in
                </span>
              )}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 text-sm font-bold tabular-nums",
              closed ? "text-slate-500" : "text-navy-900",
            )}
          >
            {priceLabel(booking)}
          </span>
        </button>

        {(hasActions || reserveActions) && (
          <div
            className={cn(
              // Full width under the row on a phone; a fixed column on wider screens so prices line up.
              "flex gap-2 sm:w-56 sm:shrink-0 sm:justify-end [&>*]:min-w-0 [&>*]:flex-1 [&>*]:shrink sm:[&>*]:flex-none",
              !hasActions && "hidden sm:flex",
            )}
          >
            {isQuoteRequest(booking) && (
              <Button asChild variant="outline" className={PRESS}>
                <Link href="/dashboard/quotes">Send a quote</Link>
              </Button>
            )}
            {canAccept && (
              <Button
                type="button"
                disabled={busy || actions.offline}
                onClick={() => actions.onAccept(booking.id)}
                className={PRESS}
              >
                <Busy busy={busy}>Accept</Busy>
              </Button>
            )}
            {canNoShow && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy || actions.offline}
                onClick={() => actions.onNoShow(booking.id)}
                className="text-slate-600"
              >
                No-show
              </Button>
            )}
            {canComplete && (
              <Button
                type="button"
                disabled={busy || actions.offline}
                onClick={() => actions.onComplete(booking.id)}
                className={PRESS}
              >
                <Busy busy={busy}>Mark done</Busy>
              </Button>
            )}
          </div>
        )}
      </li>
    </>
  );
}

export type { RowActions };
