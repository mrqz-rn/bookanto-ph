"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Inbox, Loader2, Search, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";
import { acceptBooking, completeBooking, markNoShow } from "../actions";
import type { BookingListItem } from "../constants";
import { BookingDetailModal } from "./booking-detail-modal";
import { BookingStatusBadge } from "./booking-status-badge";
import { CancelDialog } from "./cancel-dialog";
import { DeclineDialog } from "./decline-dialog";

type BookingInboxProps = {
  shopId?: string;
  initialBookings: BookingListItem[];
  shopStaff: Array<{ userId: string; name: string; role: string }>;
};

export function BookingInbox({ initialBookings, shopStaff }: BookingInboxProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [staffFilter, setStaffFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("all");

  const [selectedBooking, setSelectedBooking] = React.useState<BookingListItem | null>(null);
  const [declineBookingId, setDeclineBookingId] = React.useState<{
    id: string;
    refCode: string;
  } | null>(null);
  const [cancelBookingId, setCancelBookingId] = React.useState<{
    id: string;
    refCode: string;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const handleQuickAccept = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    const res = await acceptBooking({ bookingId });
    setActionLoadingId(null);
    if (res.ok) router.refresh();
  };

  const handleQuickComplete = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    const res = await completeBooking({ bookingId });
    setActionLoadingId(null);
    if (res.ok) router.refresh();
  };

  const handleQuickNoShow = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    const res = await markNoShow({ bookingId });
    setActionLoadingId(null);
    if (res.ok) router.refresh();
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 86_400_000;
  const tomorrowEnd = tomorrowStart + 86_400_000;
  const weekEnd = todayStart + 7 * 86_400_000;

  const filtered = initialBookings.filter((b) => {
    // Status filter
    if (statusFilter !== "all" && b.status !== statusFilter) return false;

    // Staff filter
    if (staffFilter !== "all" && b.staffId !== staffFilter) return false;

    // Date filter
    const bookingTime = new Date(b.startAt).getTime();
    if (dateFilter === "today") {
      if (bookingTime < todayStart || bookingTime >= tomorrowStart) return false;
    } else if (dateFilter === "tomorrow") {
      if (bookingTime < tomorrowStart || bookingTime >= tomorrowEnd) return false;
    } else if (dateFilter === "week") {
      if (bookingTime < todayStart || bookingTime >= weekEnd) return false;
    } else if (dateFilter === "past") {
      if (bookingTime >= todayStart) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchRef = b.refCode.toLowerCase().includes(q);
      const matchCustomer = b.customerName.toLowerCase().includes(q);
      const matchService = b.serviceName.toLowerCase().includes(q);
      const matchNotes = b.notes?.toLowerCase().includes(q);
      if (!matchRef && !matchCustomer && !matchService && !matchNotes) return false;
    }

    return true;
  });

  const requestedCount = initialBookings.filter((b) => b.status === "requested").length;
  const confirmedCount = initialBookings.filter((b) => b.status === "confirmed").length;
  const completedCount = initialBookings.filter((b) => b.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Booking Inbox
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Review, confirm, decline, and manage all client appointment requests.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        {/* Search & dropdowns */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-3 left-3 size-4 text-neutral-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref code, customer, service..."
              className="h-10 pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-xs text-neutral-800 outline-none"
            >
              <option value="all">All Team Members</option>
              {shopStaff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-xs text-neutral-800 outline-none"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">Next 7 Days</option>
              <option value="past">Past Bookings</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-neutral-100 pt-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "all"
                ? "bg-navy-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            All ({initialBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("requested")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "requested"
                ? "bg-amber-600 font-bold text-white"
                : "bg-amber-100 text-amber-900 hover:bg-amber-200"
            }`}
          >
            Pending Requests ({requestedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("confirmed")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "confirmed"
                ? "bg-navy-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Confirmed ({confirmedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "completed"
                ? "bg-navy-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("declined")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "declined"
                ? "bg-navy-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Declined
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("cancelled")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "cancelled"
                ? "bg-navy-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Cancelled
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("no_show")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === "no_show"
                ? "bg-navy-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            No-Show
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Inbox className="size-6" />
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-neutral-900">
              No matching bookings
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              There are no bookings matching the selected filters or search criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Details */}
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {b.refCode}
                    </span>
                    <BookingStatusBadge status={b.status} />
                    {b.isWalkIn && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        Walk-in
                      </span>
                    )}
                    <span className="text-xs text-neutral-500">
                      · {formatManila(b.startAt, "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-bold text-neutral-900">
                      {b.serviceName}
                    </h4>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs font-medium text-neutral-700">{b.customerName}</span>
                    {b.customerPhone && (
                      <span className="text-xs text-neutral-500">({b.customerPhone})</span>
                    )}
                    {b.staffName && (
                      <>
                        <span className="text-xs text-neutral-400">·</span>
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                          <UserCheck className="size-3 text-neutral-400" />
                          {b.staffName}
                        </span>
                      </>
                    )}
                  </div>

                  {b.notes && (
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{b.notes}</p>
                  )}
                </div>

                {/* Price & Actions */}
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
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        shopStaff={shopStaff}
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
