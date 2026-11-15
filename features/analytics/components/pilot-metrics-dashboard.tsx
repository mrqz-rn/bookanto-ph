"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  DollarSign,
  MapPin,
  Percent,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import { formatPeso } from "@/lib/money";

import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type CohortReportData,
  type PilotMetricsData,
} from "../constants";
import { CohortMatrixTable } from "./cohort-matrix-table";
import { FunnelChart } from "./funnel-chart";

type PilotMetricsDashboardProps = {
  metrics: PilotMetricsData;
  cohorts: CohortReportData;
  currentPeriod: AnalyticsPeriod;
};

export function PilotMetricsDashboard({
  metrics,
  cohorts,
  currentPeriod,
}: PilotMetricsDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "funnel" | "cohorts" | "breakdowns"
  >("overview");

  const handlePeriodChange = (period: string) => {
    router.push(`/admin/analytics?period=${period}`);
  };

  const maxDailyGmv = Math.max(...metrics.dailyTrends.map((d) => d.gmvCentavos), 1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
              Pilot Metrics Dashboard
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              6-Month Pilot
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Real-time funnel conversion, pilot milestone progress, customer retention, and
            transaction health.
          </p>
        </div>

        {/* Period Selector Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-1.5 text-xs font-semibold shadow-2xs">
          {ANALYTICS_PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePeriodChange(p.key)}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                currentPeriod === p.key
                  ? "bg-navy-900 font-bold text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pilot Launch Targets & Goals Progress Card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-5 shadow-2xs sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
              <Target className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-emerald-950 sm:text-lg">
                Pilot Milestone Targets
              </h2>
              <p className="text-xs text-emerald-800/80">
                Key targets defined for the pilot launch and validation decision gate
              </p>
            </div>
          </div>
          <div className="hidden text-right text-xs text-emerald-800 sm:block">
            <span>
              Period: <strong>{metrics.periodLabel}</strong>
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Shops Goal */}
          <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-600">Active Partner Shops</span>
              <span className="font-bold text-emerald-700">{metrics.shopsTargetPercent}%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-neutral-900">
                {metrics.shopsActive}
              </span>
              <span className="text-xs text-neutral-500">/ {metrics.shopsTarget} target</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.min(100, metrics.shopsTargetPercent)}%` }}
              />
            </div>
          </div>

          {/* GMV Goal */}
          <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-600">Gross Merchandise Value</span>
              <span className="font-bold text-emerald-700">{metrics.gmvTargetPercent}%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-neutral-900">
                {formatPeso(metrics.gmvCentavos)}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Target: {formatPeso(metrics.targetGmvCentavos)}
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.min(100, metrics.gmvTargetPercent)}%` }}
              />
            </div>
          </div>

          {/* Completed Bookings Goal */}
          <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-600">Completed Bookings</span>
              <span className="font-bold text-emerald-700">{metrics.completionRate}% rate</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-neutral-900">
                {metrics.completedBookings.toLocaleString()}
              </span>
              <span className="text-xs text-neutral-500">/ {metrics.totalBookings} total</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {metrics.totalBookings - metrics.completedBookings} requested/in-flight
            </p>
          </div>

          {/* Repeat Customer Rate */}
          <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-600">Customer Repeat Rate</span>
              <span className="font-bold text-emerald-700">Target: 25%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-neutral-900">
                {metrics.repeatCustomerRate}%
              </span>
              <span className="text-xs text-neutral-500">({metrics.repeatCustomers} repeats)</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              From {metrics.activeCustomers} active booking customers
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* GMV */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold tracking-wider uppercase">Platform GMV</span>
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-neutral-900 sm:text-2xl">
            {formatPeso(metrics.gmvCentavos)}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">Total settled value</p>
        </div>

        {/* Average Order Value */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Avg Booking Value
            </span>
            <Sparkles className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-neutral-900 sm:text-2xl">
            {formatPeso(metrics.averageOrderValueCentavos)}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">Per completed service</p>
        </div>

        {/* Total Bookings */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold tracking-wider uppercase">Total Bookings</span>
            <Calendar className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-neutral-900 sm:text-2xl">
            {metrics.totalBookings}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">{metrics.completedBookings} completed</p>
        </div>

        {/* Funnel Conversion */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Funnel Conversion
            </span>
            <TrendingUp className="size-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-emerald-700 sm:text-2xl">
            {metrics.funnel.overallConversionRate}%
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">View to fulfillment</p>
        </div>

        {/* Cancellation Rate */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold tracking-wider uppercase">Cancellations</span>
            <XCircle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-neutral-900 sm:text-2xl">
            {metrics.cancellationRate}%
          </p>
          <p className="mt-1 text-[10px] font-medium text-rose-500">
            {metrics.cancelledBookings} cancelled
          </p>
        </div>

        {/* No-show Rate */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold tracking-wider uppercase">No-Show Rate</span>
            <Percent className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-neutral-900 sm:text-2xl">
            {metrics.noShowRate}%
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">{metrics.noShowBookings} no-shows</p>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-neutral-200 text-xs font-semibold">
        {[
          { key: "overview", label: "Overview & Trends", icon: BarChart3 },
          { key: "funnel", label: "Booking Funnel", icon: TrendingUp },
          { key: "cohorts", label: "Cohort Retention", icon: Users },
          { key: "breakdowns", label: "Categories & Cities", icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 transition-colors ${
                isActive
                  ? "border-emerald-600 font-bold text-emerald-800"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Daily Trends */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Daily Trends Visualization */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-neutral-900">
                  Daily Booking & Revenue Trend
                </h3>
                <p className="text-xs text-neutral-500">
                  Daily volume of requests and completed booking revenue in{" "}
                  {metrics.periodLabel.toLowerCase()}
                </p>
              </div>
            </div>

            {metrics.dailyTrends.length === 0 ? (
              <div className="mt-6 flex h-36 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-xs text-neutral-400">
                No booking events recorded in this period.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="flex h-44 items-end gap-1.5 overflow-x-auto pb-2 sm:gap-2">
                  {metrics.dailyTrends.map((d) => {
                    const heightPercent = Math.max(
                      8,
                      Math.round((d.gmvCentavos / maxDailyGmv) * 100),
                    );
                    return (
                      <div
                        key={d.date}
                        className="group flex flex-1 flex-col items-center gap-1.5"
                        style={{ minWidth: "28px" }}
                      >
                        <div className="relative flex h-36 w-full items-end justify-center rounded-lg bg-neutral-50 px-1">
                          <div
                            className="w-full rounded-md bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-300 group-hover:from-emerald-700 group-hover:to-teal-500"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-400">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Funnel Summary Component */}
          <FunnelChart data={metrics.funnel} />
        </div>
      )}

      {/* Tab 2: Full Funnel Analytics */}
      {activeTab === "funnel" && (
        <div className="space-y-6">
          <FunnelChart
            data={metrics.funnel}
            title="Complete Pilot Booking Funnel"
            description="Detailed stage-by-stage drop-off rates across all marketplace visitors"
          />
        </div>
      )}

      {/* Tab 3: Cohort Retention Reports */}
      {activeTab === "cohorts" && (
        <div className="space-y-6">
          <CohortMatrixTable
            data={cohorts}
            title="Platform-Wide Customer Cohorts"
            description="Customer retention curve grouped by customer acquisition month"
          />
        </div>
      )}

      {/* Tab 4: Category & City Breakdowns */}
      {activeTab === "breakdowns" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category Breakdown Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-emerald-700" />
              <h3 className="font-display text-base font-bold text-neutral-900">
                Performance by Category
              </h3>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Demand distribution across service industries
            </p>

            <div className="mt-4 divide-y divide-neutral-100">
              {metrics.categoryBreakdown.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                  No category activity recorded
                </p>
              ) : (
                metrics.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <span className="font-semibold text-neutral-800">{cat.categoryName}</span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-neutral-500">{cat.bookingsCount} bookings</span>
                      <span className="font-bold text-emerald-800">
                        {formatPeso(cat.gmvCentavos)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* City Breakdown Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-emerald-700" />
              <h3 className="font-display text-base font-bold text-neutral-900">
                Performance by City
              </h3>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Geographic footprint across pilot cities
            </p>

            <div className="mt-4 divide-y divide-neutral-100">
              {metrics.cityBreakdown.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                  No city activity recorded
                </p>
              ) : (
                metrics.cityBreakdown.map((city) => (
                  <div
                    key={city.cityId}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <span className="font-semibold text-neutral-800">{city.cityName}</span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-neutral-500">{city.bookingsCount} bookings</span>
                      <span className="font-bold text-emerald-800">
                        {formatPeso(city.gmvCentavos)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
