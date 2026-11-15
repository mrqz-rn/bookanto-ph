"use client";

import * as React from "react";
import { Clock, Phone, RefreshCw, Scissors, User, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_CONFIG } from "@/features/bookings/constants";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { callPhoneNumber, triggerHaptic } from "../native-bridge";
import {
  formatCacheTimestamp,
  getTodayBookingsCache,
  type CachedTodaySchedule,
} from "../offline-bookings-cache";

type OfflineTodayBookingsProps = {
  shopId?: string;
};

export function OfflineTodayBookings({ shopId }: OfflineTodayBookingsProps) {
  const [cachedData, setCachedData] = React.useState<CachedTodaySchedule | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const loadData = React.useCallback(() => {
    const cached = getTodayBookingsCache(shopId);
    setCachedData(cached);
    setIsLoaded(true);
  }, [shopId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isLoaded) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Checking local offline cache...
      </div>
    );
  }

  if (!cachedData || !cachedData.data || cachedData.data.todayBookings.length === 0) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-xs sm:p-10">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <WifiOff className="size-6" />
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-neutral-900">
          No Offline Schedule Cached Yet
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-neutral-600 sm:text-sm">
          BooKanto automatically caches today&apos;s appointments whenever you open your shop
          dashboard with an internet connection. Open your dashboard while online to enable offline
          viewing.
        </p>
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            size="sm"
            onClick={() => window.location.reload()}
            className="bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800"
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Retry Network Connection
          </Button>
        </div>
      </div>
    );
  }

  const { data, cachedAt } = cachedData;
  const timeFormatted = formatCacheTimestamp(cachedAt);

  return (
    <div className="space-y-5 text-left">
      {/* Offline Status Notice */}
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <WifiOff className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="text-xs font-bold text-amber-950 sm:text-sm">
              Offline Schedule Cache Active
            </h3>
            <p className="mt-0.5 text-[11px] text-amber-800 sm:text-xs">
              Showing {data.todayBookings.length} booking(s) saved today at{" "}
              <strong>{timeFormatted}</strong>. You can call clients directly via regular cellular
              calls.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            window.location.reload();
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 sm:self-center"
        >
          <RefreshCw className="size-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            Total Today
          </p>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900">
            {data.stats.total} bookings
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            Completed
          </p>
          <p className="mt-1 font-display text-xl font-bold text-teal-700">
            {data.stats.completed} done
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            Expected Total
          </p>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900">
            {formatPeso(data.stats.totalCentavos)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            Walk-ins
          </p>
          <p className="mt-1 font-display text-xl font-bold text-purple-700">
            {data.stats.walkIns} clients
          </p>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        <h4 className="font-display text-sm font-bold text-neutral-900">
          Today&apos;s Appointments ({data.todayBookings.length})
        </h4>

        <div className="grid gap-3">
          {data.todayBookings.map((booking) => {
            const statusConfig =
              BOOKING_STATUS_CONFIG[booking.status] || BOOKING_STATUS_CONFIG.confirmed;
            return (
              <div
                key={booking.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs transition-all sm:flex-row sm:items-center"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusConfig.badgeClass}`}
                    >
                      <span className={`size-1.5 rounded-full ${statusConfig.dotClass}`} />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">
                      #{booking.refCode}
                    </span>
                    {booking.isWalkIn && (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                        Walk-in
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="size-4 text-neutral-400" />
                    <span className="font-bold text-neutral-900 sm:text-base">
                      {booking.customerName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3.5 text-neutral-400" />
                      <span className="font-medium">{formatManilaTime(booking.startAt)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Scissors className="size-3.5 text-neutral-400" />
                      <span>{booking.serviceName}</span>
                      <span className="text-neutral-400">({booking.serviceDurationMin} min)</span>
                    </div>

                    {booking.totalCentavos !== null && (
                      <div className="font-bold text-neutral-900">
                        {formatPeso(booking.totalCentavos)}
                      </div>
                    )}
                  </div>

                  {booking.address && (
                    <p className="text-[11px] text-neutral-500">
                      📍 <span className="font-medium">Location:</span> {booking.address}
                    </p>
                  )}

                  {booking.notes && (
                    <p className="text-[11px] text-neutral-500 italic">
                      &quot;{booking.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Call Button for Shop Owner */}
                {booking.customerPhone && (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        triggerHaptic("medium");
                        callPhoneNumber(booking.customerPhone!);
                      }}
                      className="w-full bg-emerald-600 font-bold text-white shadow-xs hover:bg-emerald-500 sm:w-auto"
                    >
                      <Phone className="mr-1.5 size-4" />
                      Call {booking.customerPhone}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
