"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import type { SlotDay } from "@/features/availability/slots";
import type { ActionResult } from "@/lib/errors";

type Load =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; days: SlotDay[] };

/**
 * A date strip and a grid of open start times. `load` fetches the days; change
 * `reloadKey` to fetch again (another staff member, or after a slot was taken).
 */
export function SlotPicker({
  load,
  reloadKey,
  value,
  onChange,
}: {
  load: () => Promise<ActionResult<{ days: SlotDay[] }>>;
  reloadKey: string;
  /** The chosen start time (UTC ISO), or null. */
  value: string | null;
  onChange: (startAt: string | null, label: string | null) => void;
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
        setState({ kind: "ready", days: result.data.days });
        // Open on the first day that has a free time.
        setDate(
          (current) =>
            current ??
            (result.data.days.find((day) => day.slots.length > 0) ?? result.data.days[0])?.date ??
            null,
        );
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
            <div key={i} className="h-[4.5rem] w-20 shrink-0 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <span className="sr-only">Loading open times…</span>
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

  const day = state.days.find((entry) => entry.date === date);
  if (state.days.every((entry) => entry.slots.length === 0)) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-slate-600">
        No open times in the next two weeks. Try another staff member, or check back later.
      </p>
    );
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Pick a day"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {state.days.map((entry) => {
          const selected = entry.date === date;
          const [weekday, ...rest] = entry.label.split(", ");
          return (
            <button
              key={entry.date}
              type="button"
              aria-pressed={selected}
              disabled={entry.slots.length === 0}
              onClick={() => {
                setDate(entry.date);
                onChange(null, null);
              }}
              className={`flex min-h-11 w-20 shrink-0 flex-col items-center rounded-lg border px-2 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 ${
                selected
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-border bg-card text-navy-900 hover:border-green-700"
              }`}
            >
              <span className="font-semibold">{weekday}</span>
              <span>{rest.join(", ")}</span>
              <span className="mt-1 text-xs">
                {entry.slots.length ? `${entry.slots.length} open` : "Full"}
              </span>
            </button>
          );
        })}
      </div>

      {day && day.slots.length > 0 ? (
        <div
          role="group"
          aria-label={`Times on ${day.label}`}
          className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {day.slots.map((slot) => {
            const selected = slot.startAt === value;
            return (
              <button
                key={slot.startAt}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(slot.startAt, `${day.label} · ${slot.label}`)}
                className={`min-h-11 rounded-lg border px-2 text-sm font-semibold focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                  selected
                    ? "border-green-700 bg-primary text-navy-900"
                    : "border-border bg-card text-navy-900 hover:border-green-700"
                }`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">No open times on this day. Pick another day.</p>
      )}
    </div>
  );
}
