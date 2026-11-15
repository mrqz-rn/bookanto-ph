"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, DollarSign, Scissors, TrendingUp, UserX } from "lucide-react";

import { formatPeso } from "@/lib/money";
import type { BookingListItem, ShopRevenueStats } from "../constants";
import { ExportButtons } from "./export-buttons";

type RevenueReportsProps = {
  shopId?: string;
  shopName: string;
  stats: ShopRevenueStats;
  bookings: BookingListItem[];
  currentPeriod: string;
};

export function RevenueReports({ shopName, stats, bookings, currentPeriod }: RevenueReportsProps) {
  const router = useRouter();

  const handlePeriodChange = (period: string) => {
    router.push(`/dashboard/reports?period=${period}`);
  };

  const maxDailyRevenue = Math.max(...stats.dailyTrend.map((d) => d.grossCentavos), 1);

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Revenue & Reports
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Financial analytics, service performance, team metrics, and data exports.
          </p>
        </div>

        <ExportButtons bookings={bookings} stats={stats} shopName={shopName} />
      </div>

      {/* Period Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2 text-xs font-semibold shadow-2xs">
        {[
          { key: "today", label: "Today" },
          { key: "7d", label: "Last 7 Days" },
          { key: "30d", label: "Last 30 Days" },
          { key: "month", label: "This Month" },
          { key: "year", label: "This Year" },
          { key: "all", label: "All Time" },
        ].map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => handlePeriodChange(p.key)}
            className={`rounded-xl px-3.5 py-2 transition-all ${
              currentPeriod === p.key
                ? "bg-navy-900 font-bold text-white shadow-2xs"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Simple Stats KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Gross Revenue */}
        <div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
              Gross Revenue
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <DollarSign className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-950">
            {formatPeso(stats.grossCentavos)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-emerald-700">
            From {stats.completedCount} completed services in {stats.periodLabel.toLowerCase()}
          </p>
        </div>

        {/* Completed Bookings */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Completed
            </span>
            <CheckCircle2 className="size-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {stats.completedCount}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {stats.completionRate}% completion rate
          </p>
        </div>

        {/* Average Booking Value */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Avg Ticket
            </span>
            <TrendingUp className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {formatPeso(stats.averageCentavos)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Per completed client</p>
        </div>

        {/* No-show Rate */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              No-show Rate
            </span>
            <UserX className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {stats.noShowRate}%
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Missed appointments</p>
        </div>

        {/* Walk-in Share */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Walk-in Share
            </span>
            <Scissors className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {stats.walkInRate}%
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Of total client visits</p>
        </div>
      </div>

      {/* Daily Revenue & Volume Trend Chart */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-neutral-900">
              Revenue & Activity Trend
            </h3>
            <p className="text-xs text-neutral-500">
              Daily gross revenue across {stats.periodLabel.toLowerCase()}
            </p>
          </div>
          <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
            Peak: {formatPeso(maxDailyRevenue)}
          </span>
        </div>

        {stats.dailyTrend.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            No completed booking revenue recorded for this period yet.
          </div>
        ) : (
          <div className="pt-4">
            {/* Visual Bar Graph */}
            <div className="flex h-44 items-end gap-2 overflow-x-auto pb-2">
              {stats.dailyTrend.map((day) => {
                const heightPercent = Math.max(
                  Math.round((day.grossCentavos / maxDailyRevenue) * 100),
                  day.grossCentavos > 0 ? 8 : 2,
                );

                return (
                  <div
                    key={day.date}
                    className="group relative flex min-w-[2.2rem] flex-1 flex-col items-center gap-1.5"
                  >
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-12 z-20 hidden rounded-lg bg-neutral-900 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white shadow-lg group-hover:block">
                      <div>{formatPeso(day.grossCentavos)}</div>
                      <div className="text-[10px] text-neutral-400">
                        {day.bookingsCount} completed
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all group-hover:brightness-90 ${
                        day.grossCentavos > 0 ? "bg-green-600" : "bg-neutral-200"
                      }`}
                    />

                    {/* Date label */}
                    <span className="w-full truncate text-center text-[10px] font-medium text-neutral-500">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Top Services Breakdown & Staff Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Services Breakdown */}
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900">
              Revenue by Service
            </h3>
            <span className="text-xs text-neutral-400">{stats.topServices.length} service(s)</span>
          </div>

          {stats.topServices.length === 0 ? (
            <p className="py-8 text-center text-xs text-neutral-400">
              No service revenue in this period.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topServices.map((srv) => (
                <div key={srv.serviceId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-900">{srv.serviceName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">{srv.bookingsCount} appts</span>
                      <span className="font-bold text-neutral-900">
                        {formatPeso(srv.grossCentavos)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        style={{ width: `${srv.sharePercentage}%` }}
                        className="h-full rounded-full bg-emerald-600"
                      />
                    </div>
                    <span className="w-8 text-right text-[10px] font-semibold text-neutral-500">
                      {srv.sharePercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900">Team Contribution</h3>
            <span className="text-xs text-neutral-400">
              {stats.staffPerformance.length} member(s)
            </span>
          </div>

          {stats.staffPerformance.length === 0 ? (
            <p className="py-8 text-center text-xs text-neutral-400">
              No staff-assigned booking revenue recorded for this period yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {stats.staffPerformance.map((staff) => (
                <div
                  key={staff.staffId}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 font-bold text-neutral-700">
                      {staff.staffName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-neutral-900">{staff.staffName}</span>
                      <div className="text-[11px] text-neutral-500">
                        {staff.completedCount} of {staff.assignedCount} completed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900">
                      {formatPeso(staff.grossCentavos)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
