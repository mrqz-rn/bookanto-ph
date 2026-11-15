"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Plus,
  Scissors,
  User,
  UserCheck,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PwaInstallButton } from "@/features/pwa/components/pwa-install-button";
import { saveTodayBookingsCache } from "@/features/pwa/offline-bookings-cache";
import { setAcceptingToday } from "@/features/shops/actions";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";
import { acceptBooking, completeBooking, markNoShow } from "../actions";
import type { BookingListItem, TodayDashboardData } from "../constants";
import { BookingDetailModal } from "./booking-detail-modal";
import { BookingStatusBadge } from "./booking-status-badge";
import { CancelDialog } from "./cancel-dialog";
import { DeclineDialog } from "./decline-dialog";
import { WalkInModal } from "./walk-in-modal";

export function TodayView({ shopId, data }: { shopId: string; data: TodayDashboardData }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<
    "all" | "requested" | "confirmed" | "completed" | "walk_ins"
  >("all");
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingListItem | null>(null);
  const [declineBookingId, setDeclineBookingId] = React.useState<{
    id: string;
    refCode: string;
  } | null>(null);
  const [cancelBookingId, setCancelBookingId] = React.useState<{
    id: string;
    refCode: string;
  } | null>(null);

  const [acceptingToday, setAcceptingTodayState] = React.useState(data.isAcceptingToday);
  const [togglingAccepting, setTogglingAccepting] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState(true);

  // Automatically cache today's dashboard bookings for offline use
  React.useEffect(() => {
    if (shopId && data) {
      saveTodayBookingsCache(shopId, data);
    }
  }, [shopId, data]);

  // Track connectivity for real-time offline schedule indicator
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(window.navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      router.refresh();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  const handleToggleAccepting = async () => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      return;
    }
    setTogglingAccepting(true);
    const nextState = !acceptingToday;
    const res = await setAcceptingToday({ shopId, accepting: nextState });
    setTogglingAccepting(false);
    if (res.ok) {
      setAcceptingTodayState(nextState);
      router.refresh();
    }
  };

  const handleQuickAccept = async (bookingId: string) => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      return;
    }
    setActionLoadingId(bookingId);
    const res = await acceptBooking({ bookingId });
    setActionLoadingId(null);
    if (res.ok) {
      router.refresh();
    }
  };

  const handleQuickComplete = async (bookingId: string) => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      return;
    }
    setActionLoadingId(bookingId);
    const res = await completeBooking({ bookingId });
    setActionLoadingId(null);
    if (res.ok) {
      router.refresh();
    }
  };

  const handleQuickNoShow = async (bookingId: string) => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      return;
    }
    setActionLoadingId(bookingId);
    const res = await markNoShow({ bookingId });
    setActionLoadingId(null);
    if (res.ok) {
      router.refresh();
    }
  };

  const filteredBookings = data.todayBookings.filter((b) => {
    if (filter === "requested") return b.status === "requested";
    if (filter === "confirmed") return b.status === "confirmed";
    if (filter === "completed") return b.status === "completed";
    if (filter === "walk_ins") return b.isWalkIn;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar: Today's Date & Quick Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
              Today&apos;s Schedule
            </h1>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
              {data.todayDateFormatted}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Real-time appointment schedule, pending client requests, and in-shop walk-ins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Accepting Today Toggle */}
          <button
            type="button"
            disabled={togglingAccepting}
            onClick={handleToggleAccepting}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-2xs transition-all ${
              acceptingToday
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            }`}
          >
            <span
              className={`size-2.5 rounded-full ${
                acceptingToday ? "animate-pulse bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{acceptingToday ? "Accepting Bookings" : "Paused Today"}</span>
            {togglingAccepting && <Loader2 className="size-3 animate-spin" />}
          </button>

          {/* Quick Walk-in Button */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsWalkInOpen(true)}
            className="bg-green-600 text-xs font-bold text-white shadow-xs hover:bg-green-500"
          >
            <Plus className="mr-1.5 size-4" />+ Record Walk-in
          </Button>

          {/* Quick PWA App Install Button */}
          <PwaInstallButton size="sm" variant="outline" />
        </div>
      </div>

      {/* Offline Schedule Alert */}
      {!isOnline && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 shadow-2xs"
        >
          <WifiOff className="size-5 shrink-0 text-amber-700" />
          <div>
            <span className="font-bold">Offline Schedule Mode:</span> You are currently viewing
            cached bookings saved on this device. You can view client appointments, service details,
            and call clients directly via regular cellular calls.
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Calendar className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Total Today
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-neutral-900">
              {data.stats.total}
            </span>
            <span className="text-[11px] text-neutral-500">({data.stats.completed} done)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <DollarSign className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Realized Revenue
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-emerald-700">
              {formatPeso(data.stats.realizedCentavos)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Clock className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Expected Total
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-neutral-900">
              {formatPeso(data.stats.totalCentavos)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Scissors className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Walk-ins
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-purple-700">
              {data.stats.walkIns}
            </span>
            <span className="text-[11px] text-neutral-500">clients</span>
          </div>
        </div>

        <div
          className={`col-span-2 rounded-2xl border p-4 shadow-2xs sm:col-span-1 ${
            data.stats.requested > 0
              ? "border-amber-300 bg-amber-50/70"
              : "border-neutral-200 bg-white"
          }`}
        >
          <div
            className={`flex size-9 items-center justify-center rounded-xl ${
              data.stats.requested > 0
                ? "bg-amber-200 text-amber-800"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            <BellRing className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Pending Action
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              className={`font-display text-2xl font-bold ${
                data.stats.requested > 0 ? "text-amber-900" : "text-neutral-900"
              }`}
            >
              {data.stats.requested}
            </span>
            {data.stats.requested > 0 && (
              <span className="animate-pulse text-[11px] font-bold text-amber-800">
                Needs reply
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pending Requests Banner / Section */}
      {data.pendingRequests.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-600" />
              <h2 className="font-display text-sm font-bold text-amber-950">
                Pending Booking Requests ({data.pendingRequests.length})
              </h2>
            </div>
            <span className="text-xs text-amber-800">Please accept or decline promptly</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col justify-between rounded-xl border border-amber-200 bg-white p-3.5 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-neutral-900">
                        {req.refCode}
                      </span>
                      <h4 className="font-display text-sm font-bold text-neutral-900">
                        {req.serviceName}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-neutral-900">
                      {req.totalCentavos !== null ? formatPeso(req.totalCentavos) : "Quote"}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-neutral-400" />
                      <span>
                        {formatManila(req.startAt, "h:mm a")} ({req.serviceDurationMin} mins)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="size-3.5 text-neutral-400" />
                      <span>
                        {req.customerName} {req.customerPhone && `· ${req.customerPhone}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeclineBookingId({ id: req.id, refCode: req.refCode })}
                    className="h-8 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    Decline
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleQuickAccept(req.id)}
                    className="h-8 bg-green-600 text-xs font-bold text-white hover:bg-green-500"
                  >
                    {actionLoadingId === req.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Accept Booking"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline & Schedule List */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === "all"
                  ? "bg-navy-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All ({data.todayBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("confirmed")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === "confirmed"
                  ? "bg-navy-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Confirmed ({data.stats.confirmed})
            </button>
            <button
              type="button"
              onClick={() => setFilter("completed")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === "completed"
                  ? "bg-navy-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Completed ({data.stats.completed})
            </button>
            <button
              type="button"
              onClick={() => setFilter("walk_ins")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === "walk_ins"
                  ? "bg-navy-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Walk-ins ({data.stats.walkIns})
            </button>
            {data.stats.requested > 0 && (
              <button
                type="button"
                onClick={() => setFilter("requested")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  filter === "requested"
                    ? "bg-amber-600 font-bold text-white"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                Pending ({data.stats.requested})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Showing {filteredBookings.length} appointment(s)</span>
          </div>
        </div>

        {/* Schedule List */}
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Calendar className="size-6" />
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-neutral-900">
              No appointments scheduled
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              There are no {filter !== "all" ? filter : ""} appointments on the schedule for today.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsWalkInOpen(true)}
              className="mt-4 bg-green-600 text-xs font-bold text-white hover:bg-green-500"
            >
              <Plus className="mr-1.5 size-4" />
              Add a Walk-in Client
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredBookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Time & Service Info */}
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {formatManila(b.startAt, "h:mm a")}
                    </span>
                    <BookingStatusBadge status={b.status} />
                    {b.isWalkIn && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        Walk-in
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-bold text-neutral-900">
                      {b.serviceName}
                    </h4>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-600">{b.customerName}</span>
                    {b.staffName && (
                      <>
                        <span className="text-xs text-neutral-400">·</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600">
                          <UserCheck className="size-3 text-neutral-400" />
                          {b.staffName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price & Action Buttons */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-sm font-bold text-neutral-900">
                    {b.totalCentavos !== null ? formatPeso(b.totalCentavos) : "Quote"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {b.status === "requested" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeclineBookingId({ id: b.id, refCode: b.refCode })}
                          className="h-8 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Decline
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={actionLoadingId === b.id}
                          onClick={() => handleQuickAccept(b.id)}
                          className="h-8 bg-green-600 text-xs font-bold text-white hover:bg-green-500"
                        >
                          {actionLoadingId === b.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </Button>
                      </>
                    )}

                    {b.status === "confirmed" && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickNoShow(b.id)}
                          disabled={actionLoadingId === b.id}
                          className="h-8 text-xs text-neutral-500 hover:text-amber-800"
                          title="Mark customer as No-show"
                        >
                          No-show
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={actionLoadingId === b.id}
                          onClick={() => handleQuickComplete(b.id)}
                          className="h-8 bg-teal-600 text-xs font-bold text-white hover:bg-teal-500"
                        >
                          {actionLoadingId === b.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Done
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBooking(b)}
                      className="h-8 text-xs text-neutral-600 hover:bg-neutral-100"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        shopId={shopId}
        services={data.activeServices}
        staff={data.shopStaff}
        onSuccess={() => router.refresh()}
      />

      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        shopStaff={data.shopStaff}
        onActionComplete={() => {
          setSelectedBooking(null);
          router.refresh();
        }}
      />

      {declineBookingId && (
        <DeclineDialog
          isOpen={true}
          onClose={() => setDeclineBookingId(null)}
          bookingId={declineBookingId.id}
          refCode={declineBookingId.refCode}
          onSuccess={() => router.refresh()}
        />
      )}

      {cancelBookingId && (
        <CancelDialog
          isOpen={true}
          onClose={() => setCancelBookingId(null)}
          bookingId={cancelBookingId.id}
          refCode={cancelBookingId.refCode}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
