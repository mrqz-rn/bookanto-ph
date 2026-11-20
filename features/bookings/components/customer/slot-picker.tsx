"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { SlotDay } from "@/features/availability/slots";
import type { ActionResult } from "@/lib/errors";

type Load =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; days: SlotDay[] };

type Slot = SlotDay["slots"][number];

/** Parts of the day by Manila hour, so a long list of times scans quickly. */
const PERIODS = [
  { name: "Morning", from: 0, to: 12 },
  { name: "Afternoon", from: 12, to: 17 },
  { name: "Evening", from: 17, to: 24 },
] as const;

export function groupByPeriod(slots: Slot[]) {
  return PERIODS.map((period) => ({
    name: period.name,
    slots: slots.filter((slot) => slot.hour >= period.from && slot.hour < period.to),
  })).filter((group) => group.slots.length > 0);
}

/**
 * A date strip and a grid of open start times. `load` fetches the days; change
 * `reloadKey` to fetch again (another staff member, or after a slot was taken).
 */
export function SlotPicker({
  load,
  reloadKey,
  value,
  onChange,
  today,
}: {
  load: () => Promise<ActionResult<{ days: SlotDay[] }>>;
  reloadKey: string;
  /** The chosen start time (UTC ISO), or null. */
  value: string | null;
  onChange: (startAt: string | null, label: string | null) => void;
  /** Manila date (YYYY-MM-DD) to label "Today" in the strip. */
  today?: string;
}) {
  const [state, setState] = React.useState<Load>({ kind: "loading" });
  const [date, setDate] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const loadRef = React.useRef(load);
  loadRef.current = load;

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    loadRef
      .current()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setState({ kind: "error", message: result.message });
          return;
        }
        const days = result.data.days;
        setState({ kind: "ready", days });
        // Keep the day the customer was on if it still has times; otherwise
        // open on the first day that has a free time.
        setDate((current) => {
          const kept = days.find((day) => day.date === current && day.slots.length > 0);
          return (kept ?? days.find((day) => day.slots.length > 0) ?? days[0])?.date ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error", message: "We couldn't load the open times." });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, attempt]);

  if (state.kind === "loading") {
    return (
      <div aria-busy="true">
        <div aria-hidden="true" className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="h-[4.75rem] w-[4.5rem] shrink-0 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
        <div aria-hidden="true" className="mt-5 h-4 w-20 animate-pulse rounded bg-muted" />
        <div aria-hidden="true" className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <span className="sr-only" role="status">
          Loading open times…
        </span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="rounded-lg border border-danger/30 bg-red-50 p-4">
        <p className="text-sm text-danger">{state.message}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => setAttempt((count) => count + 1)}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (state.days.every((entry) => entry.slots.length === 0)) {
    return (
      <div className="rounded-lg bg-muted px-4 py-6 text-center">
        <p className="font-semibold text-navy-900">No open times in the next two weeks</p>
        <p className="mt-1 text-sm text-slate-600">
          The shop may be fully booked. Try another staff member, or check back later.
        </p>
      </div>
    );
  }

  const day = state.days.find((entry) => entry.date === date);
  const groups = day ? groupByPeriod(day.slots) : [];

  return (
    <div>
      <div
        role="group"
        aria-label="Pick a day"
        className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0 sm:pb-0"
      >
        {state.days.map((entry) => {
          const selected = entry.date === date;
          const open = entry.slots.length;
          const [weekday, ...rest] = entry.label.split(", ");
          return (
            <button
              key={entry.date}
              type="button"
              aria-pressed={selected}
              disabled={open === 0}
              aria-label={`${entry.label}, ${open ? `${open} open ${open === 1 ? "time" : "times"}` : "no open times"}`}
              onClick={() => {
                setDate(entry.date);
                onChange(null, null);
              }}
              className={`flex min-h-11 w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-lg border px-1 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed sm:w-auto ${
                selected
                  ? "border-navy-900 bg-navy-900 text-white"
                  : open
                    ? "border-border bg-card text-navy-900 hover:border-green-700"
                    : "border-transparent bg-muted text-slate-600"
              }`}
            >
              <span className="font-semibold">{entry.date === today ? "Today" : weekday}</span>
              <span>{rest.join(", ")}</span>
              <span
                className={`mt-1 text-xs ${selected ? "text-white" : open ? "font-medium text-green-700" : ""}`}
              >
                {open ? `${open} open` : "No times"}
              </span>
            </button>
          );
        })}
      </div>

      {day && groups.length > 0 ? (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.name} role="group" aria-label={`${group.name} times on ${day.label}`}>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">{group.name}</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.slots.map((slot) => {
                  const selected = slot.startAt === value;
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange(slot.startAt, `${day.label} · ${slot.label}`)}
                      className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-1 text-sm font-semibold whitespace-nowrap tabular-nums focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                        selected
                          ? "border-green-700 bg-green-700 text-white"
                          : "border-border bg-card text-navy-900 hover:border-green-700"
                      }`}
                    >
                      {selected && <Check aria-hidden className="size-4" />}
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No open times on this day. Pick another day.</p>
      )}
    </div>
  );
}
