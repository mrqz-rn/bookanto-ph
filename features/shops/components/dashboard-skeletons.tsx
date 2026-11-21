import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for the "Today" tab (/dashboard)
 */
export function TodayDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading today's schedule" className="space-y-6">
      {/* Header: title and hours, then the bookings switch and Add walk-in */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-5 w-72 max-w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-11 w-full rounded-full sm:w-48" />
          <Skeleton className="h-11 w-full rounded-md sm:w-36" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Up next and Today so far */}
        <div className="space-y-6 lg:order-2 lg:col-span-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="mt-4 h-9 w-28 rounded-md" />
            <Skeleton className="mt-2 h-4 w-24 rounded-sm" />
            <Skeleton className="mt-4 h-5 w-40 rounded-sm" />
            <Skeleton className="mt-2 h-4 w-48 rounded-sm" />
            <Skeleton className="mt-5 h-11 w-full rounded-md" />
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
            <div className="mt-5 grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16 rounded-sm" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="overflow-hidden rounded-2xl border border-border bg-white lg:order-1 lg:col-span-8">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <Skeleton className="h-6 w-24 rounded-md" />
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-20 shrink-0 rounded-full" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 sm:px-5">
                <div className="w-16 shrink-0 space-y-1.5 sm:w-20">
                  <Skeleton className="h-4 w-14 rounded-sm" />
                  <Skeleton className="h-3 w-10 rounded-sm" />
                </div>
                <Skeleton className="mt-1.5 size-2.5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 max-w-full rounded-sm" />
                  <Skeleton className="h-4 w-52 max-w-full rounded-sm" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-12 shrink-0 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading today&apos;s schedule…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Booking Inbox" tab (/dashboard/inbox): the header,
 * the three views, search, then two days of bookings.
 */
export function InboxDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading booking inbox"
      className="max-w-5xl space-y-6"
    >
      {/* Header: title and the one line of counts */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 rounded-lg sm:h-10" />
        <Skeleton className="h-5 w-80 max-w-full rounded-md" />
      </div>

      {/* Views and search */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-border pb-3">
          <Skeleton className="h-7 flex-1 rounded-lg sm:w-32 sm:flex-none" />
          <Skeleton className="h-7 flex-1 rounded-lg sm:w-32 sm:flex-none" />
          <Skeleton className="h-7 flex-1 rounded-lg sm:w-24 sm:flex-none" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>

      {/* Two days of bookings */}
      {[3, 2].map((rows, group) => (
        <div key={group} className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-sm" />
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-white">
            {Array.from({ length: rows }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:px-5"
              >
                <div className="flex flex-1 items-start gap-4">
                  <div className="w-[5.25rem] shrink-0 space-y-1.5">
                    <Skeleton className="h-5 w-16 rounded-sm" />
                    <Skeleton className="h-4 w-12 rounded-sm" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex justify-between gap-3">
                      <Skeleton className="h-5 w-36 rounded-sm" />
                      <Skeleton className="h-5 w-14 rounded-sm" />
                    </div>
                    <Skeleton className="h-4 w-52 max-w-full rounded-sm" />
                  </div>
                </div>
                <div className="flex gap-2 md:w-72 md:justify-end">
                  <Skeleton className="h-11 flex-1 rounded-md md:w-24 md:flex-none" />
                  <Skeleton className="h-11 flex-1 rounded-md md:w-24 md:flex-none" />
                  <Skeleton className="size-11 shrink-0 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <span className="sr-only">Loading booking inbox…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Calendar" tab (/dashboard/calendar)
 */
export function CalendarDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading booking calendar" className="space-y-6">
      {/* Header: title, summary line, Add walk-in */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44 rounded-lg sm:h-10" />
          <Skeleton className="h-5 w-64 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-full rounded-md md:w-40" />
      </div>

      {/* Toolbar and legend */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-44 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-md" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-11 w-full rounded-full sm:w-44" />
            <Skeleton className="h-11 w-full rounded-full sm:w-40" />
          </div>
        </div>
        <Skeleton className="h-5 w-80 max-w-full rounded-md" />
      </div>

      {/* Week grid: day headers and hour rows */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="grid grid-cols-7 gap-1 border-b border-border p-2 md:ml-16 md:gap-0 md:p-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 py-2 md:py-3">
              <Skeleton className="h-3 w-6 rounded-sm" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex">
          <div className="w-16 shrink-0 space-y-[46px] px-2 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="ml-auto h-3 w-10 rounded-sm" />
            ))}
          </div>
          <div className="relative grid h-[512px] flex-1 grid-cols-1 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`relative border-l border-border ${i > 0 ? "hidden md:block" : ""}`}
              >
                {i % 2 === 0 && <Skeleton className="absolute inset-x-1 top-16 h-14 rounded-md" />}
                {i % 3 === 1 && <Skeleton className="absolute inset-x-1 top-52 h-20 rounded-md" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading booking calendar…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Walk-ins" tab (/dashboard/walk-ins)
 */
export function WalkInsDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading walk-ins"
      className="flex flex-col gap-8"
    >
      {/* Header: title, one line, Add walk-in */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="h-5 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-full rounded-md md:w-40" />
      </div>

      {/* Today: three numbers in one band */}
      <div className="grid grid-cols-3 divide-x rounded-2xl border bg-white">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 p-4 sm:p-5">
            <Skeleton className="h-4 w-24 max-w-full rounded-sm" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>

      {/* All walk-ins: heading, filters, one day of rows */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-7 w-36 rounded-md" />
          <Skeleton className="h-11 w-full rounded-full lg:w-[36rem]" />
        </div>
        <Skeleton className="h-4 w-20 rounded-sm" />
        <div className="divide-y rounded-2xl border bg-white">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-4 py-3.5"
            >
              <Skeleton className="h-4 w-14 rounded-sm" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 max-w-full rounded-sm" />
                <Skeleton className="h-4 w-56 max-w-full rounded-sm" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-4 w-12 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading walk-ins…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Reviews" tab (/dashboard/reviews)
 */
export function ReviewsDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading customer reviews" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="mt-3 h-8 w-20 rounded-md" />
            <Skeleton className="mt-2 h-3 w-28 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-12 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm" />
                </div>
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
            <Skeleton className="h-4 w-3/4 rounded-sm" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading customer reviews…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Staff Accounts" tab (/dashboard/staff)
 */
export function StaffDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading staff accounts" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-3 h-3 w-24 rounded-sm" />
            <Skeleton className="mt-2 h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Team Members List */}
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-36 rounded-sm" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-48 rounded-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading staff accounts…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Revenue & Stats" tab (/dashboard/reports)
 */
export function ReportsDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading revenue and analytics reports"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Period Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xs">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-xl" />
        ))}
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs sm:col-span-1 lg:col-span-2">
          <Skeleton className="h-3.5 w-28 rounded-sm" />
          <Skeleton className="mt-3 h-9 w-36 rounded-md" />
          <Skeleton className="mt-2 h-3 w-44 rounded-sm" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="mt-3 h-7 w-20 rounded-md" />
            <Skeleton className="mt-2 h-3 w-28 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Chart / Breakdown Area */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      <span className="sr-only">Loading revenue and analytics reports…</span>
    </div>
  );
}

/**
 * Skeleton loader for Services & prices (/dashboard/services): the title and
 * summary, the three tabs, then a category of service rows.
 */
export function ServicesDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading services and prices"
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-5 w-72 max-w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Skeleton className="col-span-2 h-11 rounded-md sm:order-last sm:w-40" />
          <Skeleton className="h-11 rounded-md sm:w-32" />
          <Skeleton className="h-11 rounded-md sm:w-28" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 pb-3">
        <Skeleton className="h-6 flex-1 rounded-md sm:w-28 sm:flex-none" />
        <Skeleton className="h-6 flex-1 rounded-md sm:w-28 sm:flex-none" />
        <Skeleton className="h-6 flex-1 rounded-md sm:w-36 sm:flex-none" />
      </div>

      <div className="space-y-3 pt-2">
        <Skeleton className="h-6 w-36 rounded-md" />
        <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 sm:p-5">
              <div className="flex gap-4">
                <Skeleton className="size-16 shrink-0 rounded-xl sm:size-20" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-5 w-40 max-w-[60%] rounded-sm" />
                    <Skeleton className="h-6 w-16 rounded-sm" />
                  </div>
                  <Skeleton className="h-4 w-48 max-w-full rounded-sm" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                <Skeleton className="mr-auto h-6 w-28 rounded-full" />
                <Skeleton className="size-11 rounded-md sm:w-44" />
                <Skeleton className="h-11 w-20 rounded-md" />
                <Skeleton className="size-11 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading services and prices…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Availability" tab (/dashboard/availability)
 */
export function AvailabilityDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading shop availability"
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-52 rounded-lg sm:h-10" />
        <Skeleton className="h-5 w-80 max-w-full rounded-md" />
      </div>

      {/* Your week, beside what comes next */}
      <div className="grid overflow-hidden rounded-2xl border border-border bg-white lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-7 w-36 rounded-md" />
          <div className="space-y-3.5">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="grid grid-cols-[2.75rem_1fr_6.5rem] items-center gap-3">
                <Skeleton className="h-4 w-8 rounded-sm" />
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="ml-auto h-4 w-20 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border border-t border-border bg-neutral-50 lg:border-t-0 lg:border-l">
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-5 sm:px-6">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-4 w-44 max-w-full rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-14 w-full rounded-full" />

      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="space-y-2 border-b border-border p-4 sm:p-6">
            <Skeleton className="h-7 w-44 rounded-md" />
            <Skeleton className="h-4 w-full max-w-lg rounded-md" />
          </div>
          <div className="space-y-2.5 p-4 sm:p-6">
            {Array.from({ length: 4 }).map((_, row) => (
              <Skeleton key={row} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}

      <span className="sr-only">Loading your shop&apos;s availability…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Shop Details" tab (/dashboard/setup)
 */
export function SetupDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading shop details and setup"
      className="mx-auto max-w-4xl space-y-6 py-2"
    >
      {/* Stepper Header */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="hidden h-4 w-24 rounded-sm sm:block" />
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-80 max-w-full rounded-sm" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <span className="sr-only">Loading shop details…</span>
    </div>
  );
}

/**
 * Skeleton loader for Booking Details & Chat (/dashboard/bookings/[id])
 */
export function BookingDetailDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading booking details and chat"
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-sm" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-sm" />
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="flex h-[480px] flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
            <div className="space-y-2 border-b border-neutral-100 pb-3">
              <Skeleton className="h-5 w-48 rounded-sm" />
              <Skeleton className="h-3.5 w-36 rounded-sm" />
            </div>
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-2/3 rounded-2xl" />
              <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
              <Skeleton className="h-12 w-3/5 rounded-2xl" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading booking details…</span>
    </div>
  );
}

/**
 * Returns the matching skeleton component for any dashboard route path.
 */
export function getDashboardSkeletonForPath(pathname: string): React.ReactNode {
  if (pathname === "/dashboard") {
    return <TodayDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/inbox")) {
    return <InboxDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/calendar")) {
    return <CalendarDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/walk-ins")) {
    return <WalkInsDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/reviews")) {
    return <ReviewsDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/staff")) {
    return <StaffDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return <ReportsDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/services")) {
    return <ServicesDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/availability")) {
    return <AvailabilityDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/setup")) {
    return <SetupDashboardSkeleton />;
  }
  if (pathname.startsWith("/dashboard/bookings")) {
    return <BookingDetailDashboardSkeleton />;
  }
  return <TodayDashboardSkeleton />;
}
