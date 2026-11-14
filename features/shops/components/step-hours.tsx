"use client";

import * as React from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setShopHours } from "../actions";
import { STANDARD_HOURS_PRESETS, WEEKDAYS } from "../constants";

type BusinessHourRow = {
  weekday: number;
  opens: string;
  closes: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isOpen: boolean;
};

type StepHoursProps = {
  shopId: string;
  initialHours?: Array<{
    weekday: number;
    opens: string;
    closes: string;
    breakStart?: string | null;
    breakEnd?: string | null;
  }>;
  onBack: () => void;
  onComplete: () => void;
};

export function StepHours({ shopId, initialHours = [], onBack, onComplete }: StepHoursProps) {
  // Initialize all 7 days (Mon-Sat default open 9am-6pm, Sun closed)
  const [schedule, setSchedule] = React.useState<BusinessHourRow[]>(() => {
    return WEEKDAYS.map((wd) => {
      const existing = initialHours.find((h) => h.weekday === wd.day);
      if (existing) {
        return {
          weekday: wd.day,
          opens: existing.opens.slice(0, 5),
          closes: existing.closes.slice(0, 5),
          breakStart: existing.breakStart ? existing.breakStart.slice(0, 5) : null,
          breakEnd: existing.breakEnd ? existing.breakEnd.slice(0, 5) : null,
          isOpen: true,
        };
      }
      return {
        weekday: wd.day,
        opens: "09:00",
        closes: "18:00",
        breakStart: null,
        breakEnd: null,
        isOpen: wd.day !== 0, // Sunday closed by default
      };
    });
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateDay = (day: number, updates: Partial<BusinessHourRow>) => {
    setSchedule((prev) => prev.map((row) => (row.weekday === day ? { ...row, ...updates } : row)));
  };

  const copyMondayToWeekdays = () => {
    const monday = schedule.find((s) => s.weekday === 1);
    if (!monday) return;

    setSchedule((prev) =>
      prev.map((row) => {
        // Weekdays: 1 (Mon) to 5 (Fri)
        if (row.weekday >= 1 && row.weekday <= 5) {
          return {
            ...row,
            isOpen: monday.isOpen,
            opens: monday.opens,
            closes: monday.closes,
            breakStart: monday.breakStart,
            breakEnd: monday.breakEnd,
          };
        }
        return row;
      }),
    );
  };

  const applyPreset = (opens: string, closes: string) => {
    setSchedule((prev) => prev.map((row) => (row.isOpen ? { ...row, opens, closes } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const openDays = schedule.filter((s) => s.isOpen);
    if (openDays.length === 0) {
      setError("Please set at least one day where your shop is open.");
      return;
    }

    // Check time logic
    for (const day of openDays) {
      if (day.closes <= day.opens) {
        const wdName = WEEKDAYS.find((w) => w.day === day.weekday)?.label;
        setError(`${wdName}: Closing time must be later than opening time.`);
        return;
      }
      if (
        (day.breakStart && !day.breakEnd) ||
        (!day.breakStart && day.breakEnd) ||
        (day.breakStart && day.breakEnd && day.breakEnd <= day.breakStart)
      ) {
        const wdName = WEEKDAYS.find((w) => w.day === day.weekday)?.label;
        setError(`${wdName}: Please provide valid break start and end times.`);
        return;
      }
    }

    setLoading(true);

    try {
      const result = await setShopHours({
        shopId,
        hours: openDays.map((d) => ({
          weekday: d.weekday,
          opens: d.opens,
          closes: d.closes,
          breakStart: d.breakStart || null,
          breakEnd: d.breakEnd || null,
        })),
      });

      if (result.ok) {
        onComplete();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to save operating hours. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Header & Quick presets */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Operating Schedule</h3>
          <p className="text-xs text-neutral-500">
            Customers will only be able to book during your open hours.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyMondayToWeekdays}
            className="text-xs text-navy-900"
          >
            <Copy className="mr-1.5 size-3.5" />
            Copy Mon to Weekdays
          </Button>
        </div>
      </div>

      {/* Preset time quick buttons */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
        <span className="font-medium">Quick presets:</span>
        {STANDARD_HOURS_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.opens, p.closes)}
            className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 7-Day Rows */}
      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {schedule.map((row) => {
          const weekdayInfo = WEEKDAYS.find((w) => w.day === row.weekday)!;
          return (
            <div
              key={row.weekday}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                !row.isOpen ? "bg-neutral-50/70 opacity-70" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`open-${row.weekday}`}
                  checked={row.isOpen}
                  onChange={(e) => updateDay(row.weekday, { isOpen: e.target.checked })}
                  className="size-4.5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                <label
                  htmlFor={`open-${row.weekday}`}
                  className="w-24 text-sm font-semibold text-neutral-900"
                >
                  {weekdayInfo.label}
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    row.isOpen
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {row.isOpen ? "Open" : "Closed"}
                </span>
              </div>

              {row.isOpen ? (
                <div className="flex flex-wrap items-center gap-2 pl-7 text-xs sm:pl-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500">Opens:</span>
                    <input
                      type="time"
                      value={row.opens}
                      onChange={(e) => updateDay(row.weekday, { opens: e.target.value })}
                      className="h-9 rounded-md border border-neutral-300 px-2 text-xs text-neutral-900"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500">Closes:</span>
                    <input
                      type="time"
                      value={row.closes}
                      onChange={(e) => updateDay(row.weekday, { closes: e.target.value })}
                      className="h-9 rounded-md border border-neutral-300 px-2 text-xs text-neutral-900"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Break (optional):</span>
                    <input
                      type="time"
                      value={row.breakStart || ""}
                      onChange={(e) =>
                        updateDay(row.weekday, { breakStart: e.target.value || null })
                      }
                      placeholder="Start"
                      className="h-9 rounded-md border border-neutral-300 px-2 text-xs text-neutral-900"
                    />
                    <span className="text-neutral-400">–</span>
                    <input
                      type="time"
                      value={row.breakEnd || ""}
                      onChange={(e) => updateDay(row.weekday, { breakEnd: e.target.value || null })}
                      placeholder="End"
                      className="h-9 rounded-md border border-neutral-300 px-2 text-xs text-neutral-900"
                    />
                  </div>
                </div>
              ) : (
                <span className="pl-7 text-xs text-neutral-400 italic sm:pl-0">
                  Not accepting bookings on {weekdayInfo.label}s
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse justify-between gap-3 pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          ← Back to Location
        </Button>
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Saving hours..." : "Save & Continue to Photos →"}
        </Button>
      </div>
    </form>
  );
}
