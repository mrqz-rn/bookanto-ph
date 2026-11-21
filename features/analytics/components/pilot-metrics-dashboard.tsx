"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, Info, MapPin, Tag } from "lucide-react";
import { cn } from "cn";

import { formatPeso } from "@/lib/money";

import {
  ANALYTICS_PERIODS,
  PILOT_TARGETS,
  type AnalyticsPeriod,
  type CohortReportData,
  type PilotMetricsData,
} from "../constants";
import { CohortMatrixTable } from "./cohort-matrix-table";
import { DailyTrendChart } from "./daily-trend-chart";
import { FunnelChart } from "./funnel-chart";
import { Panel, PanelHeader } from "./panel";
import { RankedBars } from "./ranked-bars";

type PilotMetricsDashboardProps = {
  metrics: PilotMetricsData;
  cohorts: CohortReportData;
  currentPeriod: AnalyticsPeriod;
};

/** Periods long enough to compare against the whole pilot's targets. */
const PILOT_WIDE_PERIODS: readonly AnalyticsPeriod[] = ["pilot", "all"];

function percentOf(value: number, target: number): number {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

export function PilotMetricsDashboard({
  metrics,
  cohorts,
  currentPeriod,
}: PilotMetricsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingPeriod, setPendingPeriod] = React.useState<AnalyticsPeriod | null>(null);
  const shownPeriod = isPending && pendingPeriod ? pendingPeriod : currentPeriod;

  const changePeriod = (period: AnalyticsPeriod) => {
    if (period === currentPeriod) return;
    setPendingPeriod(period);
    startTransition(() => {
      router.push(`/admin/analytics?period=${period}`, { scroll: false });
    });
  };

  const periodText = metrics.periodLabel.toLowerCase();
  const isPilotWide = PILOT_WIDE_PERIODS.includes(currentPeriod);

  const targets = [
    {
      label: "Active partner shops",
      value: metrics.shopsActive.toLocaleString(),
      target: metrics.shopsTarget.toLocaleString(),
      percent: percentOf(metrics.shopsActive, metrics.shopsTarget),
      note:
        metrics.shopsPending > 0 ? (
          <Link
            href="/admin/shops?status=pending"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-green-700 underline-offset-4 hover:underline lg:min-h-0"
          >
            {metrics.shopsPending} waiting for approval
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          "No shops waiting for approval"
        ),
    },
    {
      label: "Bookings",
      value: metrics.totalBookings.toLocaleString(),
      target: PILOT_TARGETS.bookings.toLocaleString(),
      percent: percentOf(metrics.totalBookings, PILOT_TARGETS.bookings),
      note: `${metrics.completedBookings.toLocaleString()} completed`,
    },
    {
      label: "Gross merchandise value",
      value: formatPeso(metrics.gmvCentavos),
      target: formatPeso(metrics.targetGmvCentavos),
      percent: percentOf(metrics.gmvCentavos, metrics.targetGmvCentavos),
      note: "Value of completed bookings",
    },
    {
      label: "Repeat customer rate",
      value: `${metrics.repeatCustomerRate}%`,
      target: `${PILOT_TARGETS.customerRetentionRate}%`,
      percent: percentOf(metrics.repeatCustomerRate, PILOT_TARGETS.customerRetentionRate),
      note: `${metrics.repeatCustomers.toLocaleString()} of ${metrics.activeCustomers.toLocaleString()} customers booked again`,
    },
  ];

  const bookingStats = [
    {
      label: "Average booking value",
      value: formatPeso(metrics.averageOrderValueCentavos),
      note: "Per completed booking",
    },
    {
      label: "Completion rate",
      value: `${metrics.completionRate}%`,
      note: `${metrics.completedBookings.toLocaleString()} of ${metrics.totalBookings.toLocaleString()} bookings`,
    },
    {
      label: "Cancellation rate",
      value: `${metrics.cancellationRate}%`,
      note: `${metrics.cancelledBookings.toLocaleString()} cancelled`,
    },
    {
      label: "No-show rate",
      value: `${metrics.noShowRate}%`,
      note: `${metrics.noShowBookings.toLocaleString()} no-shows`,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Pilot metrics
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Shops, bookings, revenue and repeat customers against the targets for the 6-month pilot.
          </p>
        </div>

        {/* One filter row above everything it scopes. */}
        <div
          role="group"
          aria-label="Period"
          className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-2xs sm:inline-flex"
        >
          {ANALYTICS_PERIODS.map((p) => {
            const isActive = shownPeriod === p.key;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => changePeriod(p.key)}
                className={cn(
                  "h-11 flex-1 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-[background-color,color,transform] active:scale-[0.97] sm:flex-none lg:h-9",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {p.shortLabel}
              </button>
            );
          })}
        </div>
      </header>

      {/* While the next period loads, keep this one on screen, dimmed. */}
      <div
        aria-busy={isPending}
        className={cn("space-y-8 transition-opacity", isPending && "opacity-60")}
      >
        <Panel aria-labelledby="pilot-targets">
          <PanelHeader
            id="pilot-targets"
            title="Pilot targets"
            description={`Progress toward the pilot's four targets, ${periodText}.`}
          />

          {!isPilotWide ? (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                The targets cover the whole pilot, so only shops count in full here.
              </p>
              <button
                type="button"
                onClick={() => changePeriod("pilot")}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start font-semibold text-green-700 underline-offset-4 hover:underline sm:self-auto lg:min-h-9"
              >
                See pilot to date
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : null}

          <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {targets.map((t) => {
              const met = t.percent >= 100;
              return (
                <li key={t.label} className="flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t.label}</span>
                    {met ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                        <CircleCheck className="size-3.5" aria-hidden />
                        Target met
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {t.percent}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-3xl font-semibold tracking-tight text-foreground">
                      {t.value}
                    </span>
                    <span className="text-sm text-muted-foreground">of {t.target}</span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label={`${t.label}, share of target`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, t.percent)}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-green-100"
                  >
                    <div
                      className="h-full rounded-full bg-green-600 transition-[width] duration-500"
                      style={{ width: `${Math.min(100, t.percent)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{t.note}</div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel aria-labelledby="bookings-revenue">
          <PanelHeader
            id="bookings-revenue"
            title="Bookings and revenue"
            description={`What happened to every booking ${periodText}, and what completed bookings earned.`}
          />

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border pb-6 lg:grid-cols-4">
            {bookingStats.map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="mt-0.5 text-2xl font-semibold text-foreground">{s.value}</dd>
                <dd className="text-xs text-muted-foreground">{s.note}</dd>
              </div>
            ))}
          </dl>

          <DailyTrendChart data={metrics.dailyTrends} periodLabel={metrics.periodLabel} />
        </Panel>

        <FunnelChart data={metrics.funnel} />

        <CohortMatrixTable data={cohorts} />

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <RankedBars
            id="by-category"
            title="Bookings by category"
            description="A shop listed in two categories counts in both."
            items={metrics.categoryBreakdown.map((c) => ({
              id: c.categoryId,
              name: c.categoryName,
              bookingsCount: c.bookingsCount,
              gmvCentavos: c.gmvCentavos,
            }))}
            emptyIcon={Tag}
            emptyTitle="No category activity in this period"
          />
          <RankedBars
            id="by-city"
            title="Bookings by city"
            description="Where the shops taking the bookings are."
            items={metrics.cityBreakdown.map((c) => ({
              id: c.cityId,
              name: c.cityName,
              bookingsCount: c.bookingsCount,
              gmvCentavos: c.gmvCentavos,
            }))}
            emptyIcon={MapPin}
            emptyTitle="No city activity in this period"
          />
        </div>
      </div>
    </div>
  );
}
