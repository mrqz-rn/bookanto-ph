import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for the "Today" tab (/dashboard)
 */
export function TodayDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading today's schedule" className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-3 h-3 w-24 rounded-sm" />
            <Skeleton className="mt-2 h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Filter Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-lg" />
        ))}
      </div>

      {/* Today's Bookings List */}
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-28 rounded-sm" />
                <Skeleton className="h-4 w-36 rounded-sm" />
              </div>
              <Skeleton className="h-3.5 w-48 rounded-sm" />
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Skeleton className="h-5 w-14 rounded-sm" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading today&apos;s schedule…</span>
    </div>
  );
}

/**
 * Skeleton loader for the "Booking Inbox" tab (/dashboard/inbox)
 */
export function InboxDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading booking inbox" className="space-y-6">
      {/* Top Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-neutral-100 pt-2">
          <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-36 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-24 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-24 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
        </div>
      </div>

      {/* Bookings List */}
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-28 rounded-sm" />
                <Skeleton className="h-4 w-28 rounded-sm" />
              </div>
              <Skeleton className="h-3.5 w-44 rounded-sm" />
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Skeleton className="h-5 w-14 rounded-sm" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-12 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

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
      {/* Top Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Calendar Navigation & Grid */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-44 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 border-b border-neutral-100 pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-4 w-10 rounded-sm" />
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[84px] space-y-1.5 rounded-xl border border-neutral-100 p-2"
            >
              <Skeleton className="h-4 w-6 rounded-sm" />
              {i % 3 === 0 && <Skeleton className="h-5 w-full rounded-md" />}
              {i % 5 === 0 && <Skeleton className="h-5 w-4/5 rounded-md" />}
            </div>
          ))}
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
    <div role="status" aria-busy="true" aria-label="Loading walk-in clients" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-3 h-3 w-28 rounded-sm" />
            <Skeleton className="mt-2 h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Walk-in List */}
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded-sm" />
                <Skeleton className="h-4 w-32 rounded-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded-sm" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading walk-in clients…</span>
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
 * Skeleton loader for the "Services & Pricing" tab (/dashboard/services)
 */
export function ServicesDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading services and pricing"
      className="space-y-6 py-2"
    >
      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex space-x-6 border-b border-neutral-200 pb-3">
        <Skeleton className="h-5 w-28 rounded-sm" />
        <Skeleton className="h-5 w-32 rounded-sm" />
        <Skeleton className="h-5 w-24 rounded-sm" />
        <Skeleton className="h-5 w-36 rounded-sm" />
      </div>

      {/* Services Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40 rounded-sm" />
                <Skeleton className="h-3.5 w-24 rounded-sm" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full rounded-sm" />
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading services and pricing…</span>
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
      className="mx-auto max-w-4xl space-y-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
      </div>

      <Skeleton className="h-12 w-full rounded-full" />

      {Array.from({ length: 3 }).map((_, section) => (
        <div
          key={section}
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs sm:p-6"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, row) => (
              <Skeleton key={row} className="h-11 w-full rounded-lg" />
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
