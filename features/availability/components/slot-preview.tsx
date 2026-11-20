"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { getOpenSlots } from "../actions";
import { MAX_SLOT_DAYS } from "../constants";
import type { SlotDay } from "../slots";
import { fieldLabel, selectClass } from "./panel";

export type PreviewService = {
  id: string;
  name: string;
  /** "30 min · 10 min buffer · 2 per slot" */
  rules: string;
};

type Load =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; days: SlotDay[] };

/**
 * What customers will see: open start times for a service over the next two
 * weeks, straight from the slot engine.
 */
export function SlotPreview({
  services,
  staff,
  today,
}: {
  services: PreviewService[];
  staff: Array<{ userId: string; name: string }>;
  today: string;
}) {
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [load, setLoad] = React.useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setLoad({ kind: "loading" });
    getOpenSlots({ serviceId, date: today, days: MAX_SLOT_DAYS, staffId: staffId || null })
      .then((result) => {
        if (cancelled) return;
        setLoad(
          result.ok
            ? { kind: "ready", days: result.data.days }
            : { kind: "error", message: result.message },
        );
      })
      .catch(() => {
        if (!cancelled) setLoad({ kind: "error", message: "We couldn't load the slots." });
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, staffId, today, attempt]);

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="font-medium text-navy-900">No bookable services yet</p>
        <p className="mt-1 text-sm text-slate-600">
          Add an active service with Slot, Home or Quote booking to see its open times here.
        </p>
      </div>
    );
  }

  const service = services.find((entry) => entry.id === serviceId);
  const day = load.kind === "ready" ? load.days.find((entry) => entry.date === selectedDate) : null;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="preview-service" className={fieldLabel}>
            Service
          </label>
          <select
            id="preview-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className={selectClass}
          >
            {services.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          {service && <p className="mt-1 text-xs text-slate-600">{service.rules}</p>}
        </div>
        {staff.length > 0 && (
          <div>
            <label htmlFor="preview-staff" className={fieldLabel}>
              Staff
            </label>
            <select
              id="preview-staff"
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              className={selectClass}
            >
              <option value="">Anyone free</option>
              {staff.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4" aria-busy={load.kind === "loading"}>
        {load.kind === "loading" && <PreviewSkeleton />}

        {load.kind === "error" && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-red-50 p-4">
            <p className="text-sm text-danger">{load.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => setAttempt((count) => count + 1)}
            >
              Try again
            </Button>
          </div>
        )}

        {load.kind === "ready" && (
          <>
            <div
              role="group"
              aria-label="Pick a day"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
            >
              {load.days.map((entry) => {
                const selected = entry.date === selectedDate;
                const [weekday, ...rest] = entry.label.split(", ");
                return (
                  <button
                    key={entry.date}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedDate(entry.date)}
                    className={`flex min-h-11 w-20 shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                      selected
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-border bg-white text-navy-900 hover:border-green-700 hover:bg-accent"
                    }`}
                  >
                    <span className="font-semibold">{weekday}</span>
                    <span>{rest.join(", ")}</span>
                    <span
                      className={`mt-1 text-xs ${selected ? "text-white" : entry.slots.length ? "text-green-700" : "text-slate-600"}`}
                    >
                      {entry.slots.length ? `${entry.slots.length} open` : "Full or closed"}
                    </span>
                  </button>
                );
              })}
            </div>

            {day && day.slots.length === 0 && (
              <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-slate-600">
                No open times on {day.label}. The shop is closed, fully booked, or it&apos;s too
                late to book today.
              </p>
            )}
            {day && day.slots.length > 0 && (
              <ul
                aria-label={`Open times on ${day.label}`}
                className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8"
              >
                {day.slots.map((slot) => (
                  <li
                    key={slot.startAt}
                    className="flex min-h-11 flex-col items-center justify-center rounded-xl border border-green-700/40 bg-accent px-2 py-1 text-sm font-semibold text-navy-900 tabular-nums"
                  >
                    {slot.label}
                    {slot.remaining > 1 && (
                      <span className="text-xs font-normal text-slate-600">
                        {slot.remaining} left
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div>
      <div aria-hidden="true" className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[4.5rem] w-20 shrink-0 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading open times…</span>
    </div>
  );
}
