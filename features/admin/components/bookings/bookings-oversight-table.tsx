"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Eye, Search } from "lucide-react";

import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingStatus } from "@/lib/db/schema/enums";
import { formatCentavos } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

import { AdminBookingDetailDrawer, type BookingDetail } from "./admin-booking-detail-drawer";

type BookingRow = {
  id: string;
  refCode: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date | null;
  totalCentavos: number | null;
  quotedPriceCentavos: number | null;
  createdAt: Date;
  customerName: string | null;
  customerPhone: string | null;
  shopName: string;
  shopSlug: string;
  serviceName: string;
  serviceDurationMin: number;
  bookingType: string;
};

type BookingsOversightTableProps = {
  bookings: BookingRow[];
  total: number;
  currentStatus?: string;
  currentSearch?: string;
};

const STATUS_FILTERS = [
  "all",
  "requested",
  "quoted",
  "confirmed",
  "completed",
  "cancelled",
  "declined",
  "no_show",
  "expired",
];

export function BookingsOversightTable({
  bookings: initialBookings,
  currentStatus = "all",
  currentSearch = "",
}: BookingsOversightTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(currentSearch);
  const [status, setStatus] = React.useState(currentStatus);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const updateFilters = (s: string, q: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin/bookings?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(status, search);
  };

  const handleOpenDetail = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBooking(data);
        setDrawerOpen(true);
      }
    } finally {
      // drawer open
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-1 text-xs font-semibold text-neutral-700">
          {STATUS_FILTERS.map((s) => {
            const isTabActive = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  updateFilters(s, search);
                }}
                className={`rounded-md px-2.5 py-1.5 capitalize transition-colors ${
                  isTabActive
                    ? "bg-white font-bold text-neutral-900 shadow-2xs"
                    : "text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {s.replace("_", "-")}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 size-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search ref #, customer, shop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Ref Code</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {initialBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                initialBookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => handleOpenDetail(b.id)}
                    className="cursor-pointer transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-neutral-900">
                      #{b.refCode}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-neutral-900">{b.shopName}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-neutral-900">
                        {b.customerName || "Customer"}
                      </p>
                      <p className="text-[11px] text-neutral-500">{b.customerPhone || "—"}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-neutral-900">{b.serviceName}</p>
                      <p className="text-[11px] text-neutral-500 capitalize">
                        {b.serviceDurationMin}m • {b.bookingType}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-neutral-700">{formatDateTime(b.startAt)}</td>

                    <td className="px-4 py-3.5 font-mono font-bold text-neutral-900">
                      {b.totalCentavos !== null
                        ? formatCentavos(b.totalCentavos)
                        : b.quotedPriceCentavos !== null
                          ? formatCentavos(b.quotedPriceCentavos)
                          : "Quote"}
                    </td>

                    <td className="px-4 py-3.5">
                      <BookingStatusBadge status={b.status} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(b.id);
                        }}
                        className="h-7 px-2 text-neutral-600 hover:text-neutral-900"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminBookingDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        booking={selectedBooking}
      />
    </div>
  );
}
