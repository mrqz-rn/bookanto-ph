"use client";

import * as React from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatManilaDateRange, isCalendarDate } from "@/lib/time";

import type { MetricsRange } from "../constants";

type DateRange = { from: string; to: string };

/** Give it a key from the range so it starts over when the URL changes. */
type MetricsRangeFilterProps = {
  range: MetricsRange;
  /** Today's Manila date, from the server, so both renders agree. */
  today: string;
  /** null shows the whole pilot. */
  onSelect: (next: DateRange | null) => void;
};

function shiftDate(date: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const MODES = [
  { value: "pilot", label: "Pilot" },
  { value: "custom", label: "Custom range" },
] as const;

export function MetricsRangeFilter({ range, today, onSelect }: MetricsRangeFilterProps) {
  const fromId = React.useId();
  const toId = React.useId();
  const [mode, setMode] = React.useState<MetricsRange["kind"]>(range.kind);
  const [draft, setDraft] = React.useState<DateRange>(
    range.kind === "custom"
      ? { from: range.from, to: range.to }
      : { from: shiftDate(today, -29), to: today },
  );
  const [errors, setErrors] = React.useState<{ from?: string; to?: string }>({});

  const chooseMode = (next: MetricsRange["kind"]) => {
    setMode(next);
    if (next === "pilot" && range.kind !== "pilot") onSelect(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { from?: string; to?: string } = {};
    if (!isCalendarDate(draft.from)) nextErrors.from = "Pick a start date.";
    if (!isCalendarDate(draft.to)) nextErrors.to = "Pick an end date.";
    else if (!nextErrors.from && draft.to < draft.from) {
      nextErrors.to = "Pick a date on or after the start date.";
    }
    setErrors(nextErrors);
    if (nextErrors.from || nextErrors.to) return;
    onSelect(draft);
  };

  const isCurrent = range.kind === "custom" && draft.from === range.from && draft.to === range.to;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          role="group"
          aria-label="Date range"
          className="flex w-full rounded-xl border border-border bg-card p-1 shadow-2xs sm:inline-flex sm:w-auto lg:mt-[1.625rem]"
        >
          {MODES.map((option) => {
            const isActive = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => chooseMode(option.value)}
                className={cn(
                  "h-11 flex-1 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-[background-color,color,transform] active:scale-[0.97] sm:flex-none",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {mode === "custom" ? (
          <form
            noValidate
            onSubmit={handleSubmit}
            aria-label="Custom date range"
            className="grid grid-cols-2 gap-3 sm:flex sm:items-start"
          >
            <div className="min-w-0">
              <label htmlFor={fromId} className="mb-1.5 block text-sm font-medium text-foreground">
                From
              </label>
              <Input
                id={fromId}
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                aria-invalid={errors.from ? true : undefined}
                aria-describedby={errors.from ? `${fromId}-error` : undefined}
                className="text-sm sm:w-44"
              />
              {errors.from ? (
                <p id={`${fromId}-error`} className="mt-1 text-sm text-destructive">
                  {errors.from}
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <label htmlFor={toId} className="mb-1.5 block text-sm font-medium text-foreground">
                To
              </label>
              <Input
                id={toId}
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                aria-invalid={errors.to ? true : undefined}
                aria-describedby={errors.to ? `${toId}-error` : undefined}
                className="text-sm sm:w-44"
              />
              {errors.to ? (
                <p id={`${toId}-error`} className="mt-1 text-sm text-destructive">
                  {errors.to}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={isCurrent}
              className="col-span-2 active:scale-[0.97] sm:mt-[1.625rem]"
            >
              Show these dates
            </Button>
          </form>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-semibold text-foreground">
          {range.kind === "pilot" ? "the pilot, " : ""}
          {formatManilaDateRange(range.from, range.to)}
        </span>
      </p>
    </div>
  );
}
