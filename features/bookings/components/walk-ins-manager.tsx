"use client";

import { CircleCheck, Clock, Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";
import { cn } from "@/lib/utils";

import { completeBooking } from "../actions";
import type { BookingListItem } from "../constants";
import { walkInNote } from "../walk-in-notes";
import { BookingDetailModal } from "./booking-detail-modal";
import { BookingStatusBadge } from "./booking-status-badge";
import { useNow } from "./use-now";
import { WalkInModal } from "./walk-in-modal";

type WalkInsManagerProps = {
  shopId: string;
  initialWalkIns: BookingListItem[];
  activeServices: Array<{
    id: string;
    name: string;
    priceCentavos: number | null;
    durationMin: number;
  }>;
  shopStaff: Array<{ userId: string; name: string; role: string }>;
  /** The server's time, so the first render matches on both sides. */
  nowIso: string;
};

type Filter = "all" | "serving" | "done" | "cancelled";

const FILTERS: Array<{ value: Filter; label: string; matches: (b: BookingListItem) => boolean }> = [
  { value: "all", label: "All", matches: () => true },
  { value: "serving", label: "Being served", matches: (b) => b.status === "confirmed" },
  { value: "done", label: "Done", matches: (b) => b.status === "completed" },
  {
    value: "cancelled",
    label: "Cancelled",
    matches: (b) => b.status === "cancelled" || b.status === "no_show",
  },
];

const PRESS = "transition-transform active:scale-[0.98]";

function dayKey(instant: string | number): string {
  return formatManila(new Date(instant), "yyyy-MM-dd");
}

function dayLabel(key: string, now: number): string {
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(now - 86_400_000)) return "Yesterday";
  return formatManila(new Date(`${key}T12:00:00+08:00`), "EEE, MMM d");
}

/** "just now", "25 min", "1 h 5 min". */
function elapsed(fromIso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
}

function price(b: BookingListItem): string {
  return b.totalCentavos !== null ? formatPeso(b.totalCentavos) : "Quote";
}

export function WalkInsManager({
  shopId,
  initialWalkIns,
  activeServices,
  shopStaff,
  nowIso,
}: WalkInsManagerProps) {
  const router = useRouter();
  const now = useNow(nowIso);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingListItem | null>(null);
  const [completingId, setCompletingId] = React.useState<string | null>(null);
  const [completeError, setCompleteError] = React.useState<{ id: string; message: string } | null>(
    null,
  );

  const handleComplete = async (bookingId: string) => {
    setCompletingId(bookingId);
    setCompleteError(null);
    try {
      const res = await completeBooking({ bookingId });
      if (res.ok) {
        router.refresh();
      } else {
        setCompleteError({ id: bookingId, message: res.message });
      }
    } catch {
      setCompleteError({ id: bookingId, message: "Couldn't reach the server. Try again." });
    } finally {
      setCompletingId(null);
    }
  };

  const today = dayKey(now);
  const todays = initialWalkIns.filter((b) => dayKey(b.startAt) === today);
  const serving = initialWalkIns
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const earnedToday = todays
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.totalCentavos ?? 0), 0);

  const query = search.trim().toLowerCase();
  const activeFilter = FILTERS.find((f) => f.value === filter) ?? FILTERS[0]!;
  const shown = initialWalkIns.filter((b) => {
    if (!activeFilter.matches(b)) return false;
    if (!query) return true;
    return [b.customerName, b.customerPhone, b.serviceName, b.staffName, b.refCode, b.notes]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  const days: Array<{ key: string; items: BookingListItem[] }> = [];
  for (const b of shown) {
    const key = dayKey(b.startAt);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(b);
    else days.push({ key, items: [b] });
  }

  const openAdd = () => setIsWalkInOpen(true);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">Walk-ins</h1>
          <p className="mt-1 max-w-prose text-base text-slate-600">
            Customers who came in without booking online. Add them here so your day and your reports
            stay complete.
          </p>
        </div>
        <Button type="button" onClick={openAdd} className={cn("w-full md:w-auto", PRESS)}>
          <Plus aria-hidden />
          Add walk-in
        </Button>
      </header>

      <dl className="grid grid-cols-3 divide-x rounded-2xl border bg-white">
        <Stat label="Walk-ins today" value={String(todays.length)} />
        <Stat label="Being served" value={String(serving.length)} highlight={serving.length > 0} />
        <Stat label="Earned today" value={formatPeso(earnedToday)} />
      </dl>

      {serving.length > 0 && (
        <section aria-labelledby="serving-heading" className="flex flex-col gap-4">
          <h2 id="serving-heading" className="font-display text-xl font-bold text-navy-900">
            Being served
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {serving.map((b) => {
              const started = new Date(b.startAt).getTime();
              // The clock ticks every 30 s, so a walk-in added "just now" can
              // be seconds ahead of it. Only a real later time reads "Starts".
              const future = started > now + 5 * 60_000;
              const sameDay = dayKey(b.startAt) === today;
              const error = completeError?.id === b.id ? completeError.message : null;
              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-4 rounded-2xl border border-l-4 border-l-green-600 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-navy-900">
                        {b.customerName}
                      </p>
                      <p className="truncate text-sm text-slate-600">
                        {b.serviceName}
                        {b.staffName && ` · ${b.staffName}`}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-navy-900">{price(b)}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Clock aria-hidden className="size-4 shrink-0" />
                    {future ? (
                      <span>
                        Starts {formatManila(b.startAt, sameDay ? "h:mm a" : "MMM d, h:mm a")}
                      </span>
                    ) : (
                      <span>
                        Since {formatManila(b.startAt, sameDay ? "h:mm a" : "MMM d, h:mm a")}
                        {sameDay && (
                          <span className="font-semibold text-green-700">
                            {" "}
                            · {elapsed(b.startAt, now)}
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                  {error && (
                    <p role="alert" className="text-sm font-medium text-danger">
                      {error}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2">
                    <Button
                      type="button"
                      disabled={completingId === b.id}
                      onClick={() => handleComplete(b.id)}
                      className={cn("flex-1", PRESS)}
                    >
                      {completingId === b.id ? (
                        <Loader2 aria-hidden className="animate-spin" />
                      ) : (
                        <CircleCheck aria-hidden />
                      )}
                      Mark done
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedBooking(b)}
                      className={PRESS}
                      aria-label={`Details for ${b.customerName}, ${b.serviceName}`}
                    >
                      Details
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="history-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="history-heading" className="font-display text-xl font-bold text-navy-900">
            All walk-ins
          </h2>
          {initialWalkIns.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                role="group"
                aria-label="Show walk-ins"
                className="flex gap-0.5 overflow-x-auto rounded-full border bg-white p-0.5"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={filter === f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      filter === f.value
                        ? "bg-navy-900 text-white"
                        : "text-slate-600 hover:bg-muted hover:text-navy-900",
                    )}
                  >
                    {f.label}
                    <span
                      className={cn(
                        "ml-1.5 tabular-nums",
                        filter === f.value ? "text-white/80" : "text-slate-500",
                      )}
                    >
                      {initialWalkIns.filter(f.matches).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <label htmlFor="walk-in-search" className="sr-only">
                  Search walk-ins
                </label>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
                />
                <Input
                  id="walk-in-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, service…"
                  className="h-11 rounded-full bg-white pr-10 pl-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-muted hover:text-navy-900"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {initialWalkIns.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent">
              <UserRound aria-hidden className="size-6 text-green-700" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-navy-900">No walk-ins yet</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              When someone comes in without a booking, add them here. It takes a few seconds and
              keeps their visit in your reports.
            </p>
            <Button type="button" onClick={openAdd} className={cn("mt-5", PRESS)}>
              <Plus aria-hidden />
              Add walk-in
            </Button>
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-10 text-center">
            <p className="font-semibold text-navy-900">
              {query ? `No walk-ins match “${search.trim()}”` : "Nothing here yet"}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className={cn("mt-4", PRESS)}
            >
              Show all walk-ins
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map((day) => {
              const dayTotal = day.items
                .filter((b) => b.status === "completed")
                .reduce((sum, b) => sum + (b.totalCentavos ?? 0), 0);
              return (
                <div key={day.key} className="flex flex-col gap-2">
                  <h3 className="flex items-baseline justify-between gap-3 px-1 text-sm font-semibold text-slate-600">
                    <span>{dayLabel(day.key, now)}</span>
                    <span className="font-medium">
                      {day.items.length} {day.items.length === 1 ? "walk-in" : "walk-ins"}
                      {dayTotal > 0 && ` · ${formatPeso(dayTotal)} earned`}
                    </span>
                  </h3>
                  <ul className="divide-y overflow-hidden rounded-2xl border bg-white">
                    {day.items.map((b) => {
                      const note = walkInNote(b.notes);
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset sm:items-center"
                          >
                            <span className="pt-0.5 text-sm font-semibold text-navy-900 tabular-nums sm:pt-0">
                              {formatManila(b.startAt, "h:mm a")}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-navy-900">
                                {b.customerName}
                                {b.customerPhone && (
                                  <span className="font-normal text-slate-600">
                                    {" "}
                                    · {b.customerPhone}
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-sm text-slate-600">
                                {b.serviceName}
                                {b.staffName && ` · ${b.staffName}`}
                                {note && ` · ${note}`}
                              </span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                              <span className="font-semibold text-navy-900 tabular-nums">
                                {price(b)}
                              </span>
                              <BookingStatusBadge status={b.status} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {initialWalkIns.length >= 100 && (
              <p className="text-center text-sm text-slate-600">
                Showing your latest 100 walk-ins. Older visits are in Reports.
              </p>
            )}
          </div>
        )}
      </section>

      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        shopId={shopId}
        services={activeServices}
        staff={shopStaff}
        onSuccess={() => router.refresh()}
      />

      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        shopStaff={shopStaff}
        onActionComplete={() => {
          setSelectedBooking(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-4 sm:p-5">
      <dt className="text-xs font-semibold text-slate-600 sm:text-sm">{label}</dt>
      <dd
        className={cn(
          "truncate font-display text-2xl font-bold tabular-nums sm:text-3xl",
          highlight ? "text-green-700" : "text-navy-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
