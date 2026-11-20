"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/db/schema/enums";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  closedAllDay,
  closuresOn,
  formatDay,
  formatMinutes,
  hoursOn,
  isCancelled,
  layoutDay,
  sameMonth,
  summarize,
  type CalendarClosure,
  type CalendarView,
  type DaySpan,
  type StaffFilter,
  type WeekdayHours,
} from "../calendar";
import { BOOKING_STATUS_CONFIG, type BookingListItem } from "../constants";
import { bookingEndMs } from "../today";
import { BookingStatusBadge } from "./booking-status-badge";
import { FOCUS_RING, PRESS } from "./booking-ui";

// The pieces of the shop calendar. State, the URL and the modals live in
// booking-calendar.tsx; these only draw.

export const CARD = "rounded-2xl border border-border bg-white";

/** A booking block's colours: a status stripe on a light tint. */
const BLOCK: Record<BookingStatus, string> = {
  requested: "border-amber-500 bg-amber-50 hover:bg-amber-100",
  quoted: "border-blue-500 bg-blue-50 hover:bg-blue-100",
  confirmed: "border-emerald-600 bg-emerald-50 hover:bg-emerald-100",
  completed: "border-slate-400 bg-slate-100 text-slate-700 hover:bg-slate-200",
  no_show: "border-orange-500 bg-orange-50 hover:bg-orange-100",
  declined: "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100",
  expired: "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100",
  cancelled: "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100",
};

/** Closures are striped so they never read as a booking. */
const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--color-slate-100)_0_6px,transparent_6px_12px)]";

function blockClass(status: BookingStatus) {
  return cn(
    "border-l-4",
    BLOCK[status],
    // Waiting for an answer: dashed, so it doesn't rely on colour alone.
    status === "requested" &&
      "border-y border-r border-dashed border-y-amber-400 border-r-amber-400",
  );
}

function bookingLabel(booking: BookingListItem) {
  const status = BOOKING_STATUS_CONFIG[booking.status]?.label ?? booking.status;
  const staff = booking.staffName ? `, with ${booking.staffName}` : "";
  return `${formatManilaTime(booking.startAt)} to ${formatManilaTime(new Date(bookingEndMs(booking)))}, ${booking.serviceName} for ${booking.customerName}${staff}. ${status}`;
}

function countLabel(count: number) {
  return `${count} ${count === 1 ? "booking" : "bookings"}`;
}

// ---------------------------------------------------------------------------
// Header and toolbar
// ---------------------------------------------------------------------------

export function CalendarHeader({
  view,
  bookings,
  onAddWalkIn,
}: {
  view: CalendarView;
  bookings: BookingListItem[];
  onAddWalkIn: () => void;
}) {
  const { total, toAnswer } = summarize(bookings);
  const span = view === "week" ? "this week" : "this month";
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">Calendar</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-base text-slate-600">
          <span>{total === 0 ? `No bookings ${span}` : `${countLabel(total)} ${span}`}</span>
          {toAnswer > 0 && (
            <>
              <span aria-hidden className="hidden text-slate-400 sm:inline">
                ·
              </span>
              <Link
                href="/dashboard/inbox"
                className={cn(
                  "font-semibold text-amber-800 underline-offset-4 hover:underline",
                  FOCUS_RING,
                )}
              >
                {toAnswer} waiting for your answer
              </Link>
            </>
          )}
        </p>
      </div>
      <Button type="button" onClick={onAddWalkIn} className={cn("w-full md:w-auto", PRESS)}>
        <Plus aria-hidden />
        Add walk-in
      </Button>
    </header>
  );
}

const VIEW_LABEL: Record<CalendarView, string> = { week: "Week", month: "Month" };

export function CalendarToolbar({
  view,
  title,
  onView,
  onStep,
  onToday,
  staff,
  staffOptions,
  onStaff,
}: {
  view: CalendarView;
  title: string;
  onView: (view: CalendarView) => void;
  onStep: (direction: -1 | 1) => void;
  onToday: () => void;
  staff: StaffFilter;
  /** Empty when the shop has one person: no filter then. */
  staffOptions: Array<{ value: StaffFilter; label: string }>;
  onStaff: (staff: StaffFilter) => void;
}) {
  const unit = view === "week" ? "week" : "month";
  const iconButton = cn(
    "grid size-11 place-items-center text-navy-900 transition-colors hover:bg-muted",
    FOCUS_RING,
  );
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="inline-flex items-center overflow-hidden rounded-full border border-border bg-white">
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label={`Previous ${unit}`}
            className={cn(iconButton, "rounded-l-full")}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className={cn(
              "h-11 border-x border-border px-4 text-sm font-semibold text-navy-900 transition-colors hover:bg-muted",
              FOCUS_RING,
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label={`Next ${unit}`}
            className={cn(iconButton, "rounded-r-full")}
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
        <h2 aria-live="polite" className="font-display text-xl font-bold text-navy-900 sm:text-2xl">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Calendar view"
          className="inline-flex shrink-0 rounded-full bg-muted p-1"
        >
          {(Object.keys(VIEW_LABEL) as CalendarView[]).map((id) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onView(id)}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-semibold transition-colors sm:px-5",
                  active
                    ? "bg-white text-navy-900 shadow-xs"
                    : "text-slate-600 hover:text-navy-900",
                  FOCUS_RING,
                )}
              >
                {VIEW_LABEL[id]}
              </button>
            );
          })}
        </div>

        {staffOptions.length > 0 && (
          <label className="relative flex min-w-0 flex-1 items-center sm:flex-none">
            <span className="sr-only">Show bookings for</span>
            <Users
              aria-hidden
              className="pointer-events-none absolute left-4 size-4 text-slate-500"
            />
            <select
              value={staff}
              onChange={(e) => onStaff(e.target.value)}
              className={cn(
                "h-11 w-full appearance-none rounded-full border border-border bg-white pr-10 pl-10 text-sm font-semibold text-navy-900 transition-colors hover:bg-muted sm:w-auto",
                FOCUS_RING,
              )}
            >
              {staffOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-4 size-4 text-slate-500"
            />
          </label>
        )}
      </div>
    </div>
  );
}

const LEGEND: Array<{ status: BookingStatus; label: string }> = [
  { status: "requested", label: "Waiting for you" },
  { status: "confirmed", label: "Confirmed" },
  { status: "completed", label: "Done" },
  { status: "no_show", label: "No-show" },
];

export function CalendarLegend({
  showCancelled,
  cancelledCount,
  onToggleCancelled,
}: {
  showCancelled: boolean;
  cancelledCount: number;
  onToggleCancelled: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <ul className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 sm:flex">
        {LEGEND.map(({ status, label }) => (
          <li key={status} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "h-4 w-6 rounded-[3px] ring-1 ring-black/5 ring-inset",
                blockClass(status),
              )}
            />
            {label}
          </li>
        ))}
        <li className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className={cn("h-4 w-6 rounded-[3px] ring-1 ring-black/10 ring-inset", STRIPES)}
          />
          Closed
        </li>
      </ul>
      {cancelledCount > 0 && (
        <button
          type="button"
          aria-pressed={showCancelled}
          onClick={onToggleCancelled}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
            showCancelled
              ? "bg-navy-900 text-white"
              : "bg-muted text-slate-600 hover:bg-neutral-200 hover:text-navy-900",
            FOCUS_RING,
          )}
        >
          {showCancelled ? "Hide cancelled" : "Show cancelled"}
          <span className={cn("tabular-nums", showCancelled ? "text-white/70" : "text-slate-400")}>
            {cancelledCount}
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week: a time grid, seven columns on a wide screen, the chosen day on a phone
// ---------------------------------------------------------------------------

type GridProps = {
  days: string[];
  byDay: Map<string, BookingListItem[]>;
  hours: WeekdayHours[];
  closures: CalendarClosure[];
  startHour: number;
  endHour: number;
  todayKey: string;
  nowMin: number;
  showStaff: boolean;
  onOpen: (booking: BookingListItem) => void;
  onAddAt: (day: string, minutes: number) => void;
};

/** The week's day headers, above the seven columns. */
function WeekHeader({
  days,
  byDay,
  hours,
  closures,
  todayKey,
}: Pick<GridProps, "days" | "byDay" | "hours" | "closures" | "todayKey">) {
  return (
    <div className="flex border-b border-border">
      <div aria-hidden className="w-16 shrink-0" />
      <div className="grid flex-1 grid-cols-7">
        {days.map((day) => {
          const today = day === todayKey;
          const open = hoursOn(hours, day);
          const closed = !open || closedAllDay(closuresOn(closures, day), open);
          const { total } = summarize(byDay.get(day) ?? []);
          return (
            <div key={day} className="border-l border-border px-2 py-3 text-center">
              <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                {formatDay(day, "EEE")}
              </p>
              <p
                className={cn(
                  "mx-auto mt-1 grid size-9 place-items-center rounded-full font-display text-lg font-bold",
                  today ? "bg-green-700 text-white" : "text-navy-900",
                )}
              >
                <span className="sr-only">{formatDay(day, "MMMM")} </span>
                {formatDay(day, "d")}
                {today && <span className="sr-only">, today</span>}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {closed ? "Closed" : total > 0 ? countLabel(total) : " "}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The time labels down the left. */
function HourGutter({
  startHour,
  endHour,
  hourPx,
}: {
  startHour: number;
  endHour: number;
  hourPx: number;
}) {
  return (
    <div aria-hidden className="relative w-16 shrink-0">
      {Array.from({ length: endHour - startHour }, (_, i) => (
        <span
          key={i}
          className={cn(
            "absolute right-2 text-xs font-medium whitespace-nowrap text-slate-600 tabular-nums",
            i === 0 ? "top-1" : "-translate-y-1/2",
          )}
          style={{ top: i === 0 ? undefined : i * hourPx }}
        >
          {formatMinutes((startHour + i) * 60)}
        </span>
      ))}
    </div>
  );
}

/** Shaded stretches of a column: outside opening hours, the break, closures. */
function Shading({
  spans,
  closed,
  startHour,
  hourPx,
}: {
  spans: Array<DaySpan & { kind: "off" | "closure" }>;
  closed: boolean;
  startHour: number;
  hourPx: number;
}) {
  const y = (min: number) => ((min - startHour * 60) / 60) * hourPx;
  return (
    <>
      {closed && <div aria-hidden className="absolute inset-0 bg-muted/70" />}
      {spans.map((s, i) => (
        <div
          key={i}
          aria-hidden
          className={cn(
            "absolute inset-x-0 overflow-hidden",
            s.kind === "off" ? "bg-muted/70" : cn("border-y border-border", STRIPES),
          )}
          style={{ top: y(s.startMin), height: y(s.endMin) - y(s.startMin) }}
        >
          {s.kind === "closure" && y(s.endMin) - y(s.startMin) >= 28 && (
            <span className="block truncate px-2 pt-1 text-xs font-semibold text-slate-600">
              {s.label}
            </span>
          )}
        </div>
      ))}
    </>
  );
}

function DayColumn({
  day,
  bookings,
  hours,
  closures,
  startHour,
  endHour,
  hourPx,
  isToday,
  nowMin,
  showStaff,
  onOpen,
  onAddAt,
}: Omit<GridProps, "days" | "byDay" | "todayKey"> & {
  day: string;
  bookings: BookingListItem[];
  hourPx: number;
  isToday: boolean;
}) {
  const gridStart = startHour * 60;
  const gridEnd = endHour * 60;
  const y = (min: number) => ((min - gridStart) / 60) * hourPx;
  const open = hoursOn(hours, day);
  const closureSpans = closuresOn(closures, day);
  const closedDay = !open;

  const spans: Array<DaySpan & { kind: "off" | "closure" }> = [];
  if (open) {
    if (open.opensMin > gridStart)
      spans.push({ startMin: gridStart, endMin: open.opensMin, label: "", kind: "off" });
    if (open.closesMin < gridEnd)
      spans.push({ startMin: open.closesMin, endMin: gridEnd, label: "", kind: "off" });
    if (open.breakSpan) spans.push({ ...open.breakSpan, kind: "off" });
  }
  for (const c of closureSpans) {
    const startMin = Math.max(c.startMin, gridStart);
    const endMin = Math.min(c.endMin, gridEnd);
    if (endMin > startMin) spans.push({ ...c, startMin, endMin, kind: "closure" });
  }

  const slots: number[] = [];
  for (let m = gridStart; m < gridEnd; m += 30) slots.push(m);
  const placed = layoutDay(bookings);

  return (
    <div className="relative border-l border-border" style={{ height: y(gridEnd) }}>
      {/* Hour lines */}
      {Array.from({ length: endHour - startHour }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute inset-x-0 border-t border-border"
          style={{ top: i * hourPx }}
        />
      ))}

      <Shading spans={spans} closed={closedDay} startHour={startHour} hourPx={hourPx} />

      {/* Empty half hours add a walk-in there. Pointer only: the keyboard has "Add walk-in". */}
      {slots.map((m) => (
        <button
          key={m}
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => onAddAt(day, m)}
          className="group absolute inset-x-0 flex items-start px-2 pt-1 text-left"
          style={{ top: y(m), height: hourPx / 2 }}
        >
          <span className="hidden items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-xs font-semibold text-green-700 shadow-xs group-hover:inline-flex">
            <Plus className="size-3.5" />
            {formatMinutes(m)}
          </span>
        </button>
      ))}

      {placed.map(({ booking, startMin, endMin, lane, lanes }) => {
        const top = y(Math.max(startMin, gridStart));
        const height = Math.max(y(Math.min(endMin, gridEnd)) - top, 22);
        const roomy = height >= 52;
        const closed = isCancelled(booking);
        return (
          <button
            key={booking.id}
            type="button"
            onClick={() => onOpen(booking)}
            aria-label={bookingLabel(booking)}
            className={cn(
              "absolute overflow-hidden rounded-md px-2 py-1 text-left text-xs text-navy-900 transition-[background-color,box-shadow,transform] hover:z-20 hover:shadow-md motion-safe:hover:-translate-y-px",
              blockClass(booking.status),
              closed && "opacity-80",
              FOCUS_RING,
              "focus-visible:z-20",
            )}
            style={{
              top,
              height,
              left: `calc(${(lane / lanes) * 100}% + 2px)`,
              width: `calc(${100 / lanes}% - 4px)`,
              zIndex: 10 + lane,
            }}
          >
            {roomy ? (
              <>
                <span className={cn("block truncate font-semibold", closed && "line-through")}>
                  {booking.serviceName}
                </span>
                <span className="block truncate tabular-nums">
                  {formatManilaTime(booking.startAt)}
                </span>
                <span className="block truncate text-slate-600">
                  {booking.customerName}
                  {showStaff && booking.staffName ? ` · ${booking.staffName}` : ""}
                </span>
              </>
            ) : (
              // Short blocks lead with the service: the grid already says the time.
              <span className="block truncate">
                <span className={cn("font-semibold", closed && "line-through")}>
                  {booking.serviceName}
                </span>{" "}
                <span className="text-slate-600 tabular-nums">
                  {formatManilaTime(booking.startAt).replace(":00", "")}
                </span>
              </span>
            )}
          </button>
        );
      })}

      {isToday && nowMin >= gridStart && nowMin <= gridEnd && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
          style={{ top: y(nowMin) }}
        >
          <span className="-ml-1.5 size-3 shrink-0 -translate-y-1/2 rounded-full bg-green-600" />
          <span className="h-0.5 flex-1 -translate-y-1/2 bg-green-600" />
        </div>
      )}
    </div>
  );
}

export function WeekView({
  selected,
  onSelect,
  ...grid
}: GridProps & { selected: string; onSelect: (day: string) => void }) {
  const { days, byDay, todayKey, startHour, endHour } = grid;
  const empty = days.every((d) => summarize(byDay.get(d) ?? []).total === 0);
  const selectedBookings = byDay.get(selected) ?? [];
  const selectedOpen = hoursOn(grid.hours, selected);

  return (
    <section aria-label="Week" className={cn(CARD, "overflow-hidden")}>
      {empty && (
        <p className="border-b border-border bg-accent px-4 py-3 text-sm text-navy-900 sm:px-5">
          No bookings this week yet. Requests from your shop page land here; pick an empty time to
          add a walk-in.
        </p>
      )}

      {/* Wide screens: the whole week */}
      <div className="hidden md:block">
        <WeekHeader
          days={days}
          byDay={byDay}
          hours={grid.hours}
          closures={grid.closures}
          todayKey={todayKey}
        />
        <div className="flex">
          <HourGutter startHour={startHour} endHour={endHour} hourPx={64} />
          <div className="grid flex-1 grid-cols-7">
            {days.map((day) => (
              <DayColumn
                key={day}
                day={day}
                bookings={byDay.get(day) ?? []}
                hourPx={64}
                isToday={day === todayKey}
                {...grid}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phones: a strip of the seven days, then the chosen day */}
      <div className="md:hidden">
        <div
          role="group"
          aria-label="Day of the week"
          className="grid grid-cols-7 gap-1 border-b border-border p-2"
        >
          {days.map((day) => {
            const active = day === selected;
            const today = day === todayKey;
            const { total } = summarize(byDay.get(day) ?? []);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                aria-label={`${formatDay(day, "EEEE, MMMM d")}${today ? ", today" : ""}: ${total === 0 ? "no bookings" : countLabel(total)}`}
                onClick={() => onSelect(day)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                  active ? "bg-navy-900 text-white" : "hover:bg-muted",
                  !active && today && "text-green-700",
                  FOCUS_RING,
                )}
              >
                <span className="text-xs font-semibold uppercase">{formatDay(day, "EEEEE")}</span>
                <span className="font-display text-lg leading-none font-bold">
                  {formatDay(day, "d")}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    total === 0 ? "bg-transparent" : active ? "bg-white" : "bg-green-600",
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <h3 className="font-display text-lg font-bold text-navy-900">
            {formatDay(selected, "EEEE, MMM d")}
          </h3>
          <p className="text-sm text-slate-600">
            {!selectedOpen
              ? "Closed"
              : summarize(selectedBookings).total === 0
                ? "No bookings"
                : countLabel(summarize(selectedBookings).total)}
          </p>
        </div>
        <div className="flex border-t border-border">
          <HourGutter startHour={startHour} endHour={endHour} hourPx={88} />
          <div className="flex-1 pr-2">
            <DayColumn
              day={selected}
              bookings={selectedBookings}
              hourPx={88}
              isToday={selected === todayKey}
              {...grid}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Month: a grid of days and the chosen day's list beside (or under) it
// ---------------------------------------------------------------------------

export function MonthGrid({
  days,
  monthKey,
  selected,
  todayKey,
  byDay,
  hours,
  onSelect,
}: {
  days: string[];
  monthKey: string;
  selected: string;
  todayKey: string;
  byDay: Map<string, BookingListItem[]>;
  hours: WeekdayHours[];
  onSelect: (day: string, focus?: boolean) => void;
}) {
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Arrow keys move the chosen day; only that day is in the tab order.
  function onKeyDown(event: React.KeyboardEvent) {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = step[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const index = days.indexOf(selected);
    const next = days[index + delta];
    if (next) onSelect(next, true);
  }

  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !grid.contains(document.activeElement)) return;
    grid.querySelector<HTMLButtonElement>(`[data-day="${selected}"]`)?.focus();
  }, [selected]);

  return (
    <section aria-label="Month" className={cn(CARD, "overflow-hidden")}>
      <div aria-hidden className="grid grid-cols-7 border-b border-border">
        {days.slice(0, 7).map((k) => (
          <p
            key={k}
            className="py-2.5 text-center text-xs font-semibold tracking-wide text-slate-600 uppercase"
          >
            <span className="sm:hidden">{formatDay(k, "EEEEE")}</span>
            <span className="hidden sm:inline">{formatDay(k, "EEE")}</span>
          </p>
        ))}
      </div>
      <div ref={gridRef} onKeyDown={onKeyDown} className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => {
          const list = (byDay.get(day) ?? []).filter((b) => !isCancelled(b));
          const { total, toAnswer } = summarize(list);
          const active = day === selected;
          const today = day === todayKey;
          const outside = !sameMonth(day, monthKey);
          const closed = !hoursOn(hours, day);
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              tabIndex={active ? 0 : -1}
              aria-pressed={active}
              aria-label={`${formatDay(day, "EEEE, MMMM d")}${today ? ", today" : ""}: ${total === 0 ? "no bookings" : countLabel(total)}${toAnswer > 0 ? `, ${toAnswer} waiting for you` : ""}`}
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex h-16 flex-col items-center gap-1 p-1.5 text-left transition-colors sm:h-auto sm:min-h-28 sm:items-stretch sm:p-2",
                outside || closed ? "bg-neutral-50" : "bg-white",
                active ? "ring-2 ring-navy-900 ring-inset" : "hover:bg-accent",
                "outline-none focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-sm font-bold tabular-nums",
                  today ? "bg-green-700 text-white" : outside ? "text-slate-400" : "text-navy-900",
                )}
              >
                {formatDay(day, "d")}
              </span>

              {/* Phones: a dot per booking, three at most */}
              {total > 0 && (
                <span aria-hidden className="flex gap-0.5 sm:hidden">
                  {list.slice(0, 3).map((b) => (
                    <span
                      key={b.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        BOOKING_STATUS_CONFIG[b.status].dotClass,
                      )}
                    />
                  ))}
                </span>
              )}

              {/* Wider: the first three bookings */}
              <span aria-hidden className="hidden w-full space-y-1 sm:block">
                {list.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className={cn(
                      "block truncate rounded-sm py-0.5 pr-1 pl-1.5 text-xs text-navy-900",
                      blockClass(b.status),
                    )}
                  >
                    <span className="font-semibold tabular-nums">
                      {formatManilaTime(b.startAt).replace(":00", "")}
                    </span>{" "}
                    {b.serviceName}
                  </span>
                ))}
                {total > 3 && (
                  <span className="block pl-1.5 text-xs font-semibold text-slate-600">
                    +{total - 3} more
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DayAgenda({
  day,
  todayKey,
  bookings,
  hours,
  closures,
  showStaff,
  onOpen,
  onAddWalkIn,
  className,
}: {
  day: string;
  todayKey: string;
  bookings: BookingListItem[];
  hours: WeekdayHours[];
  closures: CalendarClosure[];
  showStaff: boolean;
  onOpen: (booking: BookingListItem) => void;
  onAddWalkIn: () => void;
  className?: string;
}) {
  const open = hoursOn(hours, day);
  const closure = closuresOn(closures, day)[0];
  const hoursText = !open
    ? "Closed"
    : closure && closedAllDay([closure], open)
      ? closure.label
      : `Open ${formatMinutes(open.opensMin)} to ${formatMinutes(open.closesMin)}`;

  return (
    <section aria-labelledby="calendar-day" className={cn(CARD, "overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <h2 id="calendar-day" className="font-display text-xl font-bold text-navy-900">
            {day === todayKey ? "Today" : formatDay(day, "EEEE")}
            <span className="font-sans text-base font-semibold text-slate-600">
              {" "}
              {formatDay(day, "MMM d")}
            </span>
          </h2>
          <p className={cn("mt-0.5 text-sm", open ? "text-green-700" : "text-slate-600")}>
            {hoursText}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAddWalkIn}
          aria-label={`Add walk-in on ${formatDay(day, "MMMM d")}`}
          className={cn("rounded-full", PRESS)}
        >
          <Plus aria-hidden />
        </Button>
      </div>

      {bookings.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-base font-semibold text-navy-900">No bookings this day</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-slate-600">
            Pick another day, or add a walk-in for someone who called ahead.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onAddWalkIn}
            className={cn("mt-4", PRESS)}
          >
            <Plus aria-hidden />
            Add walk-in
          </Button>
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {bookings.map((b) => {
            const closed = isCancelled(b);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpen(b)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted sm:px-5",
                    FOCUS_RING,
                    "focus-visible:ring-inset",
                  )}
                >
                  <span className="w-16 shrink-0 pt-0.5 text-sm font-semibold text-navy-900 tabular-nums">
                    {formatManilaTime(b.startAt)}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 w-1 self-stretch rounded-full",
                      BOOKING_STATUS_CONFIG[b.status].dotClass,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-base font-semibold text-navy-900",
                        closed && "text-slate-500 line-through",
                      )}
                    >
                      {b.serviceName}
                    </span>
                    <span className="block truncate text-sm text-slate-600">
                      {b.customerName}
                      {b.isWalkIn ? " · Walk-in" : ""}
                      {showStaff && b.staffName ? ` · ${b.staffName}` : ""}
                    </span>
                    <span className="mt-1.5 flex items-center justify-between gap-2">
                      <BookingStatusBadge status={b.status} />
                      <span className="text-sm font-semibold text-navy-900 tabular-nums">
                        {b.totalCentavos !== null ? formatPeso(b.totalCentavos) : "Quote"}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
