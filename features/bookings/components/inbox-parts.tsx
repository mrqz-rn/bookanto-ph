"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Home,
  Loader2,
  MessageSquare,
  Search,
  StickyNote,
  Store,
  Timer,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { BookingListItem } from "../constants";
import { INBOX_VIEWS, type DayGroup, type InboxView } from "../inbox";
import { TYPE_LABELS } from "../rules";
import {
  acceptVerdict,
  canCompleteAt,
  canMarkNoShowAt,
  formatDuration,
  isClosed,
  isQuoteRequest,
  requestDeadline,
} from "../today";
import { BookingStatusBadge } from "./booking-status-badge";
import { Busy, FOCUS_RING, PRESS } from "./booking-ui";

// The pieces of the shop's booking inbox. State and server calls live in
// booking-inbox.tsx; these only draw.

export type InboxActions = {
  busyId: string | null;
  onOpen: (booking: BookingListItem) => void;
  onAccept: (booking: BookingListItem) => void;
  onDecline: (booking: BookingListItem) => void;
  onComplete: (booking: BookingListItem) => void;
  onNoShow: (booking: BookingListItem) => void;
};

const CARD = "rounded-2xl border border-border bg-white";
const MINUTE = 60_000;

function priceLabel(booking: BookingListItem) {
  const centavos = booking.totalCentavos ?? booking.quotedPriceCentavos;
  return centavos !== null ? formatPeso(centavos) : "To quote";
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function InboxHeader({ summary }: { summary: string }) {
  return (
    <header>
      <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">Booking inbox</h1>
      <p className="mt-1 text-base text-slate-600">{summary}</p>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export function InboxTabs({
  view,
  counts,
  onChange,
}: {
  view: InboxView;
  counts: Record<InboxView, number>;
  onChange: (view: InboxView) => void;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = INBOX_VIEWS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    onChange(INBOX_VIEWS[next]!.id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label="Bookings" className="flex border-b border-border">
      {INBOX_VIEWS.map(({ id, label }, index) => {
        const active = view === id;
        const count = counts[id];
        return (
          <button
            key={id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`inbox-tab-${id}`}
            aria-selected={active}
            aria-controls="inbox-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative -mb-px flex h-12 flex-auto items-center justify-center gap-1.5 rounded-t-lg px-1.5 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors sm:flex-none sm:gap-2 sm:px-5 sm:text-base",
              FOCUS_RING,
              active ? "text-navy-900" : "text-slate-600 hover:bg-neutral-100 hover:text-navy-900",
            )}
          >
            {label}{" "}
            <span
              className={cn(
                "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums sm:h-6 sm:min-w-6 sm:text-sm",
                id === "requests" && count > 0
                  ? "bg-yellow-400 text-navy-900"
                  : "bg-muted text-slate-600",
              )}
            >
              {count}
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-green-600 transition-transform duration-200 sm:inset-x-3",
                active ? "scale-x-100" : "scale-x-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search and team filter
// ---------------------------------------------------------------------------

export function InboxToolbar({
  search,
  onSearch,
  staffId,
  onStaff,
  staff,
}: {
  search: string;
  onSearch: (value: string) => void;
  staffId: string;
  onStaff: (value: string) => void;
  staff: Array<{ userId: string; name: string }>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="inbox-search" className="sr-only">
          Search bookings
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-600"
        />
        <Input
          ref={inputRef}
          id="inbox-search"
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && search) {
              event.preventDefault();
              onSearch("");
            }
          }}
          placeholder="Name, service or booking code"
          autoComplete="off"
          className="pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              onSearch("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className={cn(
              "absolute top-0 right-0 grid size-11 place-items-center rounded-md text-slate-600 hover:text-navy-900",
              FOCUS_RING,
            )}
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      {staff.length > 1 && (
        <div className="sm:w-56">
          <label htmlFor="inbox-staff" className="sr-only">
            Team member
          </label>
          <select
            id="inbox-staff"
            value={staffId}
            onChange={(event) => onStaff(event.target.value)}
            className={cn(
              "h-11 w-full rounded-md border border-input bg-white px-3 text-base text-navy-900 shadow-xs focus-visible:border-ring",
              FOCUS_RING,
            )}
          >
            <option value="all">All team members</option>
            {staff.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
            <option value="none">Not assigned yet</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day groups and rows
// ---------------------------------------------------------------------------

export function DayGroupList({
  group,
  view,
  nowMs,
  actions,
}: {
  group: DayGroup;
  view: InboxView;
  nowMs: number;
  actions: InboxActions;
}) {
  const headingId = `inbox-day-${group.key}`;
  const count = group.bookings.length;
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id={headingId} className="font-display text-xl font-bold text-navy-900">
          {group.title}
          {group.date && (
            <span className="ml-2 font-sans text-base font-medium text-slate-600">
              {group.date}
            </span>
          )}
        </h2>
        <span className="shrink-0 text-sm text-slate-600 tabular-nums">
          {count} {count === 1 ? "booking" : "bookings"}
        </span>
      </div>
      {group.key === "overdue" && (
        <p className="mt-1 px-1 text-sm text-slate-600">
          These started before today. Mark each one done or as a no-show so your reports add up.
        </p>
      )}
      <ol className={cn(CARD, "mt-3 divide-y divide-border overflow-hidden")}>
        {group.bookings.map((booking) => (
          <InboxRow
            key={booking.id}
            booking={booking}
            view={view}
            nowMs={nowMs}
            actions={actions}
          />
        ))}
      </ol>
    </section>
  );
}

function InboxRow({
  booking,
  view,
  nowMs,
  actions,
}: {
  booking: BookingListItem;
  view: InboxView;
  nowMs: number;
  actions: InboxActions;
}) {
  const closed = isClosed(booking);
  // Cancelled, declined and expired didn't happen: struck through. Done and no-show are only muted.
  const struck = closed && booking.status !== "completed" && booking.status !== "no_show";
  const busy = actions.busyId === booking.id;
  const quote = isQuoteRequest(booking);
  const answering = booking.status === "requested" && !quote;
  const verdict = answering ? acceptVerdict(booking, nowMs) : null;
  const deadline = booking.status === "requested" ? requestDeadline(booking, nowMs) : null;
  const canComplete = canCompleteAt(booking, nowMs);
  const canNoShow = canMarkNoShowAt(booking, nowMs);
  const staffLine = booking.staffName ? `with ${booking.staffName}` : null;
  // The verdict's reason says why Accept is missing, unless the deadline line already does.
  const blockedReason = verdict && !verdict.allowed && !deadline?.lapsed ? verdict.reason : null;
  const hasButtons = quote || answering || canNoShow || canComplete;

  return (
    <li className="flex flex-col gap-3 p-4 transition-colors duration-150 hover:bg-neutral-50 md:flex-row md:items-center md:gap-4 md:px-5">
      <button
        type="button"
        onClick={() => actions.onOpen(booking)}
        aria-haspopup="dialog"
        className={cn(
          "-m-2 flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2 text-left sm:gap-4",
          FOCUS_RING,
        )}
      >
        <span className="w-[5.25rem] shrink-0 whitespace-nowrap">
          <span
            className={cn(
              "block text-base font-bold tabular-nums",
              closed ? "text-slate-600" : "text-navy-900",
            )}
          >
            {formatManilaTime(booking.startAt)}
          </span>
          <span className="block text-sm text-slate-600 tabular-nums">
            {formatDuration(booking.serviceDurationMin * MINUTE)}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={cn(
                "truncate text-base font-semibold",
                closed ? "text-slate-600" : "text-navy-900",
                struck && "line-through decoration-slate-400",
              )}
            >
              {booking.customerName}
            </span>
            <span
              className={cn(
                "shrink-0 text-base font-bold tabular-nums",
                closed ? "text-slate-600" : "text-navy-900",
              )}
            >
              {priceLabel(booking)}
            </span>
          </span>
          <span className="block truncate text-sm text-slate-600">
            {booking.serviceName}
            {staffLine && ` · ${staffLine}`}
            <span className="hidden md:inline"> · {booking.refCode}</span>
          </span>

          <RowFacts booking={booking} view={view} deadline={deadline} reason={blockedReason} />

          {booking.notes && (
            <span className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
              <StickyNote aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span className="line-clamp-1">{booking.notes}</span>
            </span>
          )}
        </span>
      </button>

      {/* On a phone a row without buttons skips this bar; Message is in the details too. */}
      <div
        className={cn(
          "flex gap-2 md:w-72 md:shrink-0 md:justify-end",
          !hasButtons && "hidden md:flex",
        )}
      >
        <div className="flex min-w-0 flex-1 gap-2 md:flex-none [&>*]:min-w-0 [&>*]:flex-1 md:[&>*]:flex-none">
          {quote && (
            <Button asChild variant="outline" className={PRESS}>
              <Link href="/dashboard/quotes">Send a quote</Link>
            </Button>
          )}
          {answering && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => actions.onDecline(booking)}
              className={PRESS}
            >
              Decline
            </Button>
          )}
          {verdict?.allowed && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => actions.onAccept(booking)}
              className={PRESS}
            >
              <Busy busy={busy}>Accept</Busy>
            </Button>
          )}
          {canNoShow && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => actions.onNoShow(booking)}
              className="text-slate-600"
            >
              No-show
            </Button>
          )}
          {canComplete && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => actions.onComplete(booking)}
              className={PRESS}
            >
              <Busy busy={busy}>Mark done</Busy>
            </Button>
          )}
        </div>
        {booking.customerId ? (
          <Button asChild variant="outline" size="icon" className={PRESS} title="Messages">
            <Link
              href={`/dashboard/bookings/${booking.id}`}
              aria-label={`Message ${booking.customerName}`}
            >
              <MessageSquare aria-hidden className="size-5" />
            </Link>
          </Button>
        ) : (
          // Walk-ins have no account to message; keep the column so prices line up.
          <span aria-hidden className="hidden size-11 shrink-0 md:block" />
        )}
      </div>
    </li>
  );
}

/** The one line under the service: how long a request has left, what kind of booking it is, its status. */
function RowFacts({
  booking,
  view,
  deadline,
  reason,
}: {
  booking: BookingListItem;
  view: InboxView;
  deadline: ReturnType<typeof requestDeadline>;
  reason: string | null;
}) {
  const home = booking.bookingType === "home";
  const quote = isQuoteRequest(booking);
  const showStatus = view === "past" || booking.status === "quoted";
  if (!deadline && !reason && !home && !quote && !booking.isWalkIn && !showStatus) return null;

  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {showStatus && <BookingStatusBadge status={booking.status} />}
      {deadline && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-semibold",
            deadline.urgent ? "text-danger" : "text-warning",
          )}
        >
          <Timer aria-hidden className="size-4" />
          {deadline.label}
        </span>
      )}
      {reason && <span className="text-sm text-slate-600">{reason}</span>}
      {quote && (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-navy-900">
          {TYPE_LABELS.quote}
        </span>
      )}
      {home && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-navy-900">
          <Home aria-hidden className="size-3.5" />
          {TYPE_LABELS.home}
        </span>
      )}
      {booking.isWalkIn && (
        <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-semibold text-navy-900">
          Walk-in
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

const EMPTY: Record<InboxView, { title: string; body: string }> = {
  requests: {
    title: "No requests to answer",
    body: "New requests from your shop page land here, and you get an email for each one. A request you don't answer expires.",
  },
  upcoming: {
    title: "No confirmed bookings coming up",
    body: "Requests you accept and walk-ins you add show here, grouped by day.",
  },
  past: {
    title: "No past bookings yet",
    body: "Finished, cancelled and declined bookings move here.",
  },
};

const VIEW_NOUN: Record<InboxView, string> = {
  requests: "requests",
  upcoming: "upcoming bookings",
  past: "past bookings",
};

/** The shop has no bookings at all yet. */
export function InboxNoBookings({ shopSlug }: { shopSlug: string | null }) {
  return (
    <EmptyCard
      title="No bookings yet"
      body="Requests from your shop page show up here, and you get an email for each one. Walk-ins you add on Today show here too."
    >
      {shopSlug && (
        <Button asChild variant="outline" className={PRESS}>
          <Link href={`/shop/${shopSlug}`} target="_blank">
            <Store aria-hidden />
            Open your shop page
          </Link>
        </Button>
      )}
    </EmptyCard>
  );
}

/** One view is empty: nothing there yet, or nothing matching the search and team filter. */
export function InboxEmpty({
  view,
  filtering,
  search,
  elsewhere,
  onClear,
  onShowView,
}: {
  view: InboxView;
  /** Whether a search or team filter is on. */
  filtering: boolean;
  search: string;
  /** Another view that has matches for the same filters, with its count. */
  elsewhere: { view: InboxView; count: number } | null;
  onClear: () => void;
  onShowView: (view: InboxView) => void;
}) {
  if (filtering) {
    const term = search.trim();
    const elsewhereLabel = elsewhere
      ? INBOX_VIEWS.find((v) => v.id === elsewhere.view)?.label
      : null;
    return (
      <EmptyCard
        title={
          term
            ? `No ${VIEW_NOUN[view]} match “${term}”`
            : `No ${VIEW_NOUN[view]} for this team member`
        }
        body={
          elsewhere && elsewhereLabel
            ? `${elsewhere.count} ${elsewhere.count === 1 ? "booking matches" : "bookings match"} in ${elsewhereLabel}.`
            : "Check the spelling, or search by the booking code from the customer's message."
        }
      >
        {elsewhere && elsewhereLabel && (
          <Button type="button" onClick={() => onShowView(elsewhere.view)} className={PRESS}>
            See {elsewhereLabel.toLowerCase()}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClear} className={PRESS}>
          Clear filters
        </Button>
      </EmptyCard>
    );
  }

  return <EmptyCard title={EMPTY[view].title} body={EMPTY[view].body} />;
}

function EmptyCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(CARD, "px-5 py-12 text-center sm:py-16")}>
      <h2 className="font-display text-xl font-bold text-navy-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-base text-balance text-slate-600">{body}</p>
      {children && (
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">{children}</div>
      )}
    </div>
  );
}
