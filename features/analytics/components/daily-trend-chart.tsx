"use client";

import * as React from "react";
import { ChartColumn } from "lucide-react";
import { cn } from "cn";

import { formatPeso, formatPesoCompact } from "@/lib/money";
import { formatManila, manilaToUtc } from "@/lib/time";

import type { PilotMetricsData } from "../constants";
import { EmptyChart, SegmentedSwitch } from "./panel";

type DailyTrend = PilotMetricsData["dailyTrends"][number];
type Metric = "bookings" | "revenue";

type Bucket = {
  key: string;
  /** Full name for the tooltip and table: "Tue, Nov 10" or "Week of Nov 9". */
  label: string;
  /** Short name under the axis: "Nov 10". */
  tickLabel: string;
  bookings: number;
  completed: number;
  gmvCentavos: number;
};

const DAY_MS = 86_400_000;
const MAX_COLUMNS = 62;
const PLOT_HEIGHT = 208;

const METRIC_OPTIONS = [
  { value: "bookings", label: "Bookings" },
  { value: "revenue", label: "Revenue" },
] as const;

// "yyyy-MM-dd" Manila dates, counted as whole days so gaps can be filled.
function toDayNumber(date: string): number {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function toDateString(dayNumber: number): string {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

function formatDay(date: string, pattern: string): string {
  return formatManila(manilaToUtc(date, "12:00"), pattern);
}

/** "Oct 2–8", or "Sep 28 – Oct 4" across a month. */
function formatRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDay(startDate, "MMM d");
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return `${formatDay(startDate, "MMM d")}–${formatDay(endDate, "d")}`;
  }
  return `${formatDay(startDate, "MMM d")} – ${formatDay(endDate, "MMM d")}`;
}

/**
 * Fills the days with no bookings, and groups days into weeks (or four-week
 * blocks) when one column per day would be too thin to read.
 */
function buildBuckets(trends: DailyTrend[]): { buckets: Bucket[]; unit: string } {
  if (trends.length === 0) return { buckets: [], unit: "day" };

  const byDate = new Map(trends.map((t) => [t.date, t]));
  const days = trends.map((t) => toDayNumber(t.date));
  const first = Math.min(...days);
  const last = Math.max(...days);
  const span = last - first + 1;
  const size = span <= MAX_COLUMNS ? 1 : span <= MAX_COLUMNS * 7 ? 7 : 28;
  const unit = size === 1 ? "day" : size === 7 ? "week" : "4 weeks";

  const buckets: Bucket[] = [];
  for (let start = first; start <= last; start += size) {
    let bookings = 0;
    let completed = 0;
    let gmvCentavos = 0;
    for (let day = start; day < Math.min(start + size, last + 1); day++) {
      const entry = byDate.get(toDateString(day));
      if (!entry) continue;
      bookings += entry.bookingsCount;
      completed += entry.completedCount;
      gmvCentavos += entry.gmvCentavos;
    }
    const startDate = toDateString(start);
    const endDate = toDateString(Math.min(start + size - 1, last));
    buckets.push({
      key: startDate,
      label: size === 1 ? formatDay(startDate, "EEE, MMM d") : formatRange(startDate, endDate),
      tickLabel: formatDay(startDate, "MMM d"),
      bookings,
      completed,
      gmvCentavos,
    });
  }
  return { buckets, unit };
}

/** A clean axis: four or five round steps from zero. */
function niceScale(maxValue: number, minStep: number): { max: number; ticks: number[] } {
  const steps = minStep >= 1 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = minStep;
  if (maxValue > 0) {
    const rough = maxValue / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const multiple = steps.find((s) => rough / magnitude <= s) ?? 10;
    step = Math.max(minStep, multiple * magnitude);
  }
  const max = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks: number[] = [];
  for (let tick = 0; tick <= max + step / 2; tick += step) ticks.push(tick);
  return { max, ticks };
}

function readout(bucket: Bucket): string {
  return `${bucket.label}: ${bucket.bookings.toLocaleString()} bookings, ${bucket.completed.toLocaleString()} completed, ${formatPeso(bucket.gmvCentavos)} revenue`;
}

type DailyTrendChartProps = {
  data: DailyTrend[];
  periodLabel: string;
};

export function DailyTrendChart({ data, periodLabel }: DailyTrendChartProps) {
  const [metric, setMetric] = React.useState<Metric>("bookings");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const { buckets, unit } = React.useMemo(() => buildBuckets(data), [data]);

  const totalBookings = buckets.reduce((sum, b) => sum + b.bookings, 0);
  if (buckets.length === 0 || totalBookings === 0) {
    return (
      <EmptyChart icon={ChartColumn} title="No bookings in this period">
        Pick a longer period above, or check back once customers start booking.
      </EmptyChart>
    );
  }

  const valueOf = (b: Bucket) => (metric === "bookings" ? b.bookings : b.gmvCentavos);
  const { max, ticks } = niceScale(
    Math.max(...buckets.map(valueOf)),
    metric === "bookings" ? 1 : 100,
  );
  const formatTick = (value: number) =>
    metric === "bookings" ? value.toLocaleString() : formatPesoCompact(Math.round(value));

  const peakIndex = buckets.reduce(
    (best, b, i) => (valueOf(b) > valueOf(buckets[best]!) ? i : best),
    0,
  );
  const peak = buckets[peakIndex]!;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));
  const active = activeIndex === null ? null : buckets[activeIndex];

  const indexFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.min(buckets.length - 1, Math.max(0, Math.floor(ratio * buckets.length)));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = activeIndex ?? buckets.length - 1;
    const next =
      event.key === "ArrowLeft"
        ? current - 1
        : event.key === "ArrowRight"
          ? current + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? buckets.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActiveIndex(Math.min(buckets.length - 1, Math.max(0, next)));
  };

  const tooltipLeft = activeIndex === null ? 0 : ((activeIndex + 0.5) / buckets.length) * 100;
  const tooltipShift = tooltipLeft < 18 ? "0%" : tooltipLeft > 82 ? "-100%" : "-50%";

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Busiest {unit}:{" "}
          <span className="font-semibold text-foreground">
            {peak.label} ·{" "}
            {metric === "bookings"
              ? `${peak.bookings.toLocaleString()} bookings`
              : formatPeso(peak.gmvCentavos)}
          </span>
        </p>
        <SegmentedSwitch
          label="Chart measure"
          options={METRIC_OPTIONS}
          value={metric}
          onChange={(value) => setMetric(value)}
        />
      </div>

      {metric === "bookings" ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-[3px] bg-green-600" aria-hidden />
            Completed
          </li>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-[3px] bg-slate-400" aria-hidden />
            Requested, confirmed, cancelled or no-show
          </li>
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Value of completed bookings, per {unit === "day" ? "day" : unit}.
        </p>
      )}

      <div className="mt-8 flex">
        {/* Y axis */}
        <div className="relative w-12 shrink-0" style={{ height: PLOT_HEIGHT }} aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2 text-xs text-muted-foreground tabular-nums"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            role="slider"
            tabIndex={0}
            aria-label={`${metric === "bookings" ? "Bookings" : "Revenue"} per ${unit}, ${periodLabel.toLowerCase()}. Use the arrow keys to read each ${unit === "day" ? "day" : "column"}.`}
            aria-valuemin={0}
            aria-valuemax={buckets.length - 1}
            aria-valuenow={activeIndex ?? buckets.length - 1}
            aria-valuetext={readout(active ?? buckets[buckets.length - 1]!)}
            onPointerMove={(e) => setActiveIndex(indexFromPointer(e))}
            onPointerDown={(e) => setActiveIndex(indexFromPointer(e))}
            onPointerLeave={(e) => {
              // A tap keeps its readout until the chart loses focus.
              if (e.pointerType === "mouse") setActiveIndex(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setActiveIndex(null)}
            className="relative touch-pan-y rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            style={{ height: PLOT_HEIGHT }}
          >
            {/* Gridlines: hairline, solid, one step off the surface. */}
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn(
                  "pointer-events-none absolute inset-x-0 h-px",
                  tick === 0 ? "bg-neutral-300" : "bg-neutral-100",
                )}
                style={{ bottom: `${(tick / max) * 100}%` }}
                aria-hidden
              />
            ))}

            <div className="absolute inset-0 flex items-end" aria-hidden>
              {buckets.map((bucket, index) => {
                const isActive = index === activeIndex;
                const other = bucket.bookings - bucket.completed;
                const completedHeight =
                  metric === "bookings"
                    ? (bucket.completed / max) * 100
                    : (bucket.gmvCentavos / max) * 100;
                const otherHeight = metric === "bookings" ? (other / max) * 100 : 0;

                return (
                  <div
                    key={bucket.key}
                    className={cn(
                      "relative flex h-full flex-1 flex-col items-center justify-end transition-colors",
                      isActive && "bg-neutral-100/80",
                    )}
                  >
                    {index === peakIndex && activeIndex === null ? (
                      <span
                        className="absolute text-xs font-semibold whitespace-nowrap text-foreground tabular-nums"
                        style={{ bottom: `calc(${completedHeight + otherHeight}% + 4px)` }}
                      >
                        {formatTick(valueOf(bucket))}
                      </span>
                    ) : null}
                    <div className="flex h-full w-[70%] max-w-6 flex-col justify-end">
                      {otherHeight > 0 ? (
                        <div
                          className={cn(
                            "w-full rounded-t-[4px] transition-colors",
                            isActive ? "bg-slate-500" : "bg-slate-400",
                            completedHeight > 0 && "mb-[2px]",
                          )}
                          style={{ height: `${otherHeight}%` }}
                        />
                      ) : null}
                      {completedHeight > 0 ? (
                        <div
                          className={cn(
                            "w-full transition-colors",
                            otherHeight > 0 ? "" : "rounded-t-[4px]",
                            isActive ? "bg-green-700" : "bg-green-600",
                          )}
                          style={{ height: `${completedHeight}%` }}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {active ? (
              <div
                className="pointer-events-none absolute top-0 z-10 w-max max-w-[15rem] rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md"
                style={{
                  left: `${tooltipLeft}%`,
                  translate: `${tooltipShift} calc(-100% - 0.5rem)`,
                }}
                aria-hidden
              >
                <p className="text-xs text-muted-foreground">{active.label}</p>
                <div className="mt-1 space-y-0.5">
                  <TooltipRow
                    swatch="bg-green-600"
                    name="Completed"
                    value={active.completed.toLocaleString()}
                  />
                  <TooltipRow
                    swatch="bg-slate-400"
                    name="Other bookings"
                    value={(active.bookings - active.completed).toLocaleString()}
                  />
                  <TooltipRow swatch={null} name="Revenue" value={formatPeso(active.gmvCentavos)} />
                </div>
              </div>
            ) : null}
          </div>

          {/* X axis */}
          <div className="mt-2 flex" aria-hidden>
            {buckets.map((bucket, index) => (
              <div key={bucket.key} className="flex flex-1 justify-center">
                {index % labelEvery === 0 ? (
                  // Every other date only, under 640px, so the labels never touch.
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap text-muted-foreground",
                      (index / labelEvery) % 2 === 1 && "max-sm:invisible",
                    )}
                  >
                    {bucket.tickLabel}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <details className="group mt-5 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-green-700 hover:underline lg:min-h-9">
          <span className="group-open:hidden">Show the numbers as a table</span>
          <span className="hidden group-open:inline">Hide the table</span>
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {unit === "day" ? "Day" : "Period"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Bookings
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Completed
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 tabular-nums">
              {buckets.map((bucket) => (
                <tr key={bucket.key}>
                  <th scope="row" className="py-2 pr-4 font-medium text-foreground">
                    {bucket.label}
                  </th>
                  <td className="px-3 py-2 text-right">{bucket.bookings.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{bucket.completed.toLocaleString()}</td>
                  <td className="py-2 pl-3 text-right">{formatPeso(bucket.gmvCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function TooltipRow({
  swatch,
  name,
  value,
}: {
  swatch: string | null;
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-0.5 w-3 rounded-full", swatch ?? "bg-transparent")} aria-hidden />
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground">{name}</span>
    </div>
  );
}
