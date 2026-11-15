"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, DollarSign, Loader2, Plus, Scissors, Search, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";
import { completeBooking } from "../actions";
import type { BookingListItem } from "../constants";
import { BookingDetailModal } from "./booking-detail-modal";
import { BookingStatusBadge } from "./booking-status-badge";
import { WalkInModal } from "./walk-in-modal";

type WalkInsManagerProps = {
  shopId: string;
  initialWalkIns: BookingListItem[];
  activeServices: Array<{
    id: string;
    name: string;
    priceCentavos: number | null;
    durationMin: number;
  }>;
  shopStaff: Array<{ userId: string; name: string; role: string }>;
};

export function WalkInsManager({
  shopId,
  initialWalkIns,
  activeServices,
  shopStaff,
}: WalkInsManagerProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingListItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const handleQuickComplete = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    const res = await completeBooking({ bookingId });
    setActionLoadingId(null);
    if (res.ok) router.refresh();
  };

  const filtered = initialWalkIns.filter((b) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      b.refCode.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.serviceName.toLowerCase().includes(q) ||
      (b.notes && b.notes.toLowerCase().includes(q))
    );
  });

  const totalWalkIns = initialWalkIns.length;
  const completedWalkIns = initialWalkIns.filter((b) => b.status === "completed").length;
  const totalRevenueCentavos = initialWalkIns
    .filter((b) => b.status === "completed")
    .reduce((acc, b) => acc + (b.totalCentavos ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Walk-in Clients
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Record, track, and service client visits without requiring online booking accounts.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsWalkInOpen(true)}
          className="bg-green-600 text-xs font-bold text-white shadow-xs hover:bg-green-500"
        >
          <Plus className="mr-1.5 size-4" />+ New Walk-in Client
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Scissors className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Total Walk-in Visits
          </p>
          <p className="font-display text-2xl font-bold text-neutral-900">{totalWalkIns}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
            <CheckCircle2 className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Completed Visits
          </p>
          <p className="font-display text-2xl font-bold text-teal-700">{completedWalkIns}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <DollarSign className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Walk-in Revenue
          </p>
          <p className="font-display text-2xl font-bold text-emerald-700">
            {formatPeso(totalRevenueCentavos)}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        <div className="relative">
          <Search className="absolute top-3 left-3 size-4 text-neutral-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search walk-in guest name, service, notes..."
            className="h-10 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Walk-in Log List */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Scissors className="size-6" />
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-neutral-900">
              No walk-in clients recorded
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              Record a walk-in whenever a neighborhood customer visits your shop without an online
              booking.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsWalkInOpen(true)}
              className="mt-4 bg-green-600 text-xs font-bold text-white hover:bg-green-500"
            >
              <Plus className="mr-1.5 size-4" />
              Record First Walk-in
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {b.refCode}
                    </span>
                    <BookingStatusBadge status={b.status} />
                    <span className="text-xs text-neutral-500">
                      · {formatManila(b.startAt, "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-bold text-neutral-900">
                      {b.serviceName}
                    </h4>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs font-semibold text-neutral-700">{b.customerName}</span>
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

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-sm font-bold text-neutral-900">
                    {b.totalCentavos !== null ? formatPeso(b.totalCentavos) : "Quote"}
                  </span>

                  <div className="flex items-center gap-2">
                    {b.status === "confirmed" && (
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
                            Mark Done
                          </>
                        )}
                      </Button>
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

      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        shopId={shopId}
        services={activeServices}
        staff={shopStaff}
        onSuccess={() => router.refresh()}
      />

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
    </div>
  );
}
