"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Scissors,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";

import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type CohortReportData,
  type ShopAnalyticsData,
} from "../constants";
import { CohortMatrixTable } from "./cohort-matrix-table";
import { FunnelChart } from "./funnel-chart";

type ShopAnalyticsViewProps = {
  stats: ShopAnalyticsData;
  cohorts: CohortReportData;
  currentPeriod: AnalyticsPeriod;
};

export function ShopAnalyticsView({ stats, cohorts, currentPeriod }: ShopAnalyticsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "funnel" | "schedule" | "retention" | "team"
  >("overview");

  const handlePeriodChange = (period: string) => {
    router.push(`/dashboard/reports?period=${period}`);
  };

  const exportCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Shop Name", stats.shopName],
      ["Period", stats.periodLabel],
      ["Gross Revenue (PHP)", (stats.grossCentavos / 100).toFixed(2)],
      ["Average Ticket (PHP)", (stats.averageBookingValueCentavos / 100).toFixed(2)],
      ["Total Bookings", stats.totalBookings.toString()],
      ["Completed Bookings", stats.completedCount.toString()],
      ["Walk-in Bookings", stats.walkInCount.toString()],
      ["Cancelled Bookings", stats.cancelledCount.toString()],
      ["No-shows", stats.noShowCount.toString()],
      ["Completion Rate (%)", stats.completionRate.toString()],
      ["Unique Customers", stats.uniqueCustomers.toString()],
      ["Returning Customers", stats.returningCustomers.toString()],
      ["Repeat Rate (%)", stats.repeatCustomerRate.toString()],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${stats.shopName.toLowerCase().replace(/\s+/g, "-")}-analytics-${currentPeriod}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxBusiestCount = Math.max(...stats.busiestDays.map((d) => d.bookingsCount), 1);
  const maxPeakHourCount = Math.max(...stats.peakHours.map((h) => h.bookingsCount), 1);

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Shop Analytics & Reports
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Performance metrics, booking funnel, customer retention, and peak hours for{" "}
            {stats.shopName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Period Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2 text-xs font-semibold shadow-2xs">
        {ANALYTICS_PERIODS.map((p) => (
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

      {/* Primary KPI Cards */}
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
            From {stats.completedCount} completed services ({stats.periodLabel.toLowerCase()})
          </p>
        </div>

        {/* Avg Ticket Size */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Avg Ticket
            </span>
            <Sparkles className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {formatPeso(stats.averageBookingValueCentavos)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Per completed client</p>
        </div>

        {/* Total Bookings */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Total Volume
            </span>
            <CheckCircle2 className="size-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {stats.totalBookings}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">{stats.completionRate}% completion</p>
        </div>

        {/* Customer Repeat Rate */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Repeat Rate
            </span>
            <Users className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-800">
            {stats.repeatCustomerRate}%
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {stats.returningCustomers} returning clients
          </p>
        </div>

        {/* Walk-in Volume */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Walk-Ins
            </span>
            <UserCheck className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {stats.walkInCount}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">In-person clients</p>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-neutral-200 text-xs font-semibold">
        {[
          { key: "overview", label: "Overview & Top Services", icon: BarChart3 },
          { key: "funnel", label: "Shop Funnel", icon: TrendingUp },
          { key: "schedule", label: "Busiest Times & Heatmap", icon: Clock },
          { key: "retention", label: "Customer Retention & Cohorts", icon: Users },
          { key: "team", label: "Staff Performance", icon: Scissors },
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

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Services Card */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
              <h3 className="font-display text-base font-bold text-neutral-900">
                Top Services by Revenue
              </h3>
              <p className="text-xs text-neutral-500">
                Most requested and highest-earning offerings
              </p>

              <div className="mt-4 divide-y divide-neutral-100">
                {stats.topServices.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-400">
                    No services booked yet
                  </p>
                ) : (
                  stats.topServices.map((service) => (
                    <div
                      key={service.serviceId}
                      className="flex items-center justify-between py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-neutral-900">
                          {service.serviceName}
                        </span>
                        <span className="ml-2 text-neutral-400">
                          ({service.bookingsCount} bookings)
                        </span>
                      </div>
                      <span className="font-bold text-emerald-800">
                        {formatPeso(service.grossCentavos)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Funnel Glance */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
              <h3 className="font-display text-base font-bold text-neutral-900">
                Conversion Snapshot
              </h3>
              <p className="text-xs text-neutral-500">Quick view of shop funnel efficiency</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-xs">
                  <span className="text-neutral-600">Shop Views to Bookings</span>
                  <span className="font-bold text-emerald-700">
                    {stats.funnel.overallConversionRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-xs">
                  <span className="text-neutral-600">Cancellations</span>
                  <span className="font-bold text-neutral-900">
                    {stats.cancellationRate}% ({stats.cancelledCount})
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-xs">
                  <span className="text-neutral-600">No-Show Rate</span>
                  <span className="font-bold text-neutral-900">
                    {stats.noShowRate}% ({stats.noShowCount})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
            <h3 className="font-display text-base font-bold text-neutral-900">
              Daily Booking Volume
            </h3>
            <p className="text-xs text-neutral-500">Appointments scheduled per day</p>

            <div className="mt-4 flex h-36 items-end gap-1.5 overflow-x-auto pb-2">
              {stats.dailyTrends.map((d) => {
                const maxVol = Math.max(...stats.dailyTrends.map((t) => t.bookingsCount), 1);
                const heightPercent = Math.max(8, Math.round((d.bookingsCount / maxVol) * 100));
                return (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center gap-1"
                    style={{ minWidth: "24px" }}
                  >
                    <div className="flex h-28 w-full items-end justify-center rounded-md bg-neutral-50 px-0.5">
                      <div
                        className="w-full rounded bg-emerald-600 transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                        title={`${d.date}: ${d.bookingsCount} bookings, ${formatPeso(d.grossCentavos)}`}
                      />
                    </div>
                    <span className="text-[9px] text-neutral-400">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Shop Funnel */}
      {activeTab === "funnel" && (
        <div className="space-y-6">
          <FunnelChart
            data={stats.funnel}
            title={`${stats.shopName} Booking Funnel`}
            description="Measure conversion from your shop profile views to confirmed appointments"
          />
        </div>
      )}

      {/* Tab 3: Peak Hours & Schedules */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Busiest Days of Week */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
              <h3 className="font-display text-base font-bold text-neutral-900">
                Busiest Days of the Week
              </h3>
              <p className="text-xs text-neutral-500">
                Booking frequency by day to guide staff scheduling
              </p>

              <div className="mt-4 space-y-2.5">
                {stats.busiestDays.map((day) => {
                  const widthPercent = Math.max(
                    6,
                    Math.round((day.bookingsCount / maxBusiestCount) * 100),
                  );
                  return (
                    <div key={day.dayIndex} className="flex items-center gap-3 text-xs">
                      <span className="w-20 font-medium text-neutral-700">{day.dayName}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <div className="w-24 text-right">
                        <span className="font-bold text-neutral-900">{day.bookingsCount}</span>
                        <span className="ml-1 text-[10px] text-neutral-400">
                          ({formatPeso(day.grossCentavos)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak Hours Heatmap */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
              <h3 className="font-display text-base font-bold text-neutral-900">
                Peak Hours Heatmap
              </h3>
              <p className="text-xs text-neutral-500">
                Hourly appointment demand throughout operating hours
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {stats.peakHours.map((hour) => {
                  const intensity =
                    maxPeakHourCount > 0 ? hour.bookingsCount / maxPeakHourCount : 0;
                  const bgClass =
                    hour.bookingsCount === 0
                      ? "bg-neutral-50 text-neutral-400 border-neutral-100"
                      : intensity > 0.6
                        ? "bg-emerald-600 text-white font-bold border-emerald-700"
                        : intensity > 0.3
                          ? "bg-emerald-100 text-emerald-950 font-semibold border-emerald-200"
                          : "bg-emerald-50 text-emerald-900 border-emerald-100";

                  return (
                    <div
                      key={hour.hour}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${bgClass}`}
                    >
                      <span className="text-[10px] uppercase">{hour.hourLabel}</span>
                      <span className="mt-0.5 text-sm font-bold">{hour.bookingsCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Customer Retention & Cohorts */}
      {activeTab === "retention" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                Total Clients
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-neutral-900">
                {stats.uniqueCustomers}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                First-Time Clients
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-neutral-900">
                {stats.firstTimeCustomers}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">
                Returning Clients
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-emerald-950">
                {stats.returningCustomers} ({stats.repeatCustomerRate}%)
              </p>
            </div>
          </div>

          <CohortMatrixTable
            data={cohorts}
            title={`${stats.shopName} Customer Cohorts`}
            description="How often new clients return to your shop across subsequent months"
          />
        </div>
      )}

      {/* Tab 5: Team Performance */}
      {activeTab === "team" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <h3 className="font-display text-base font-bold text-neutral-900">
            Staff & Team Performance
          </h3>
          <p className="text-xs text-neutral-500">
            Completed appointments, gross revenue, and fulfillment rate per stylist/barber
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase">
                  <th className="py-2.5">Staff Member</th>
                  <th className="px-3 py-2.5 text-center">Assigned</th>
                  <th className="px-3 py-2.5 text-center">Completed</th>
                  <th className="px-3 py-2.5 text-center">Fulfillment Rate</th>
                  <th className="px-3 py-2.5 text-right">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stats.staffPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-400">
                      No staff assigned to completed bookings yet
                    </td>
                  </tr>
                ) : (
                  stats.staffPerformance.map((staff) => (
                    <tr key={staff.staffId} className="hover:bg-neutral-50/50">
                      <td className="py-3 font-semibold text-neutral-900">{staff.staffName}</td>
                      <td className="px-3 py-3 text-center text-neutral-600">
                        {staff.assignedCount}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-neutral-900">
                        {staff.completedCount}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          {staff.completionRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-800">
                        {formatPeso(staff.grossCentavos)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
