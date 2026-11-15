"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  MapPin,
  MessageSquare,
  Shield,
  Store,
  User,
  X,
} from "lucide-react";

import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import type { BookingStatus } from "@/lib/db/schema/enums";
import { formatCentavos } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

import { logAdminBookingView } from "../../actions";

export type BookingDetail = {
  id: string;
  refCode: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date | null;
  address: string | null;
  notes: string | null;
  totalCentavos: number | null;
  quotedPriceCentavos: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopPhone: string | null;
  serviceId: string;
  serviceName: string;
  servicePriceCentavos: number | null;
  serviceDurationMin: number;
  bookingType: string;
  events: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: Date;
    actorName: string | null;
  }>;
  disputes: Array<{
    id: string;
    reason: string;
    status: string;
    resolution: string | null;
    createdAt: Date;
    reporterName: string | null;
  }>;
  messages: Array<{
    id: string;
    body: string | null;
    imagePath: string | null;
    createdAt: Date;
    senderName: string | null;
  }>;
};

type AdminBookingDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetail | null;
};

export function AdminBookingDetailDrawer({
  isOpen,
  onClose,
  booking,
}: AdminBookingDetailDrawerProps) {
  // Log admin view on drawer open
  React.useEffect(() => {
    if (isOpen && booking?.id) {
      logAdminBookingView({ bookingId: booking.id }).catch(() => {
        // Non-blocking log
      });
    }
  }, [isOpen, booking?.id]);

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Top Drawer Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-neutral-900">
                #{booking.refCode}
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Created {formatDateTime(booking.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6 p-6 text-xs">
          {/* Quick Notice: Audit Log Written */}
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-blue-900">
            <Shield className="size-4 shrink-0 text-blue-700" />
            <span className="text-[11px]">
              This admin inspection has been recorded into the platform immutable audit log.
            </span>
          </div>

          {/* Service & Price Summary */}
          <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{booking.serviceName}</h4>
                <p className="text-xs text-neutral-500">
                  {booking.serviceDurationMin} mins • Type: {booking.bookingType}
                </p>
              </div>
              <div className="text-right">
                <span className="font-display text-base font-extrabold text-neutral-900">
                  {booking.totalCentavos !== null
                    ? formatCentavos(booking.totalCentavos)
                    : booking.quotedPriceCentavos !== null
                      ? formatCentavos(booking.quotedPriceCentavos)
                      : "Quote pending"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-neutral-200/60 pt-2 text-neutral-700">
              <Calendar className="size-4 text-orange-600" />
              <span className="font-semibold">{formatDateTime(booking.startAt)}</span>
            </div>

            {booking.address && (
              <div className="flex items-start gap-2 pt-1 text-neutral-600">
                <MapPin className="size-4 shrink-0 text-neutral-400" />
                <span>{booking.address}</span>
              </div>
            )}

            {booking.notes && (
              <div className="pt-2 text-[11px] text-neutral-600 italic">
                &ldquo;{booking.notes}&rdquo;
              </div>
            )}
          </div>

          {/* Customer & Shop Context */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-200 p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                <User className="size-3.5" /> Customer
              </span>
              <p className="mt-2 font-bold text-neutral-900">{booking.customerName || "No name"}</p>
              <p className="font-mono text-[11px] text-neutral-600">
                {booking.customerPhone || "No phone"}
              </p>
              <p className="truncate text-[11px] text-neutral-500">
                {booking.customerEmail || "No email"}
              </p>
              <Link
                href={`/admin/users/${booking.customerId}`}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 hover:underline"
              >
                View user profile <ExternalLink className="size-3" />
              </Link>
            </div>

            <div className="rounded-xl border border-neutral-200 p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                <Store className="size-3.5" /> Shop
              </span>
              <p className="mt-2 font-bold text-neutral-900">{booking.shopName}</p>
              <p className="font-mono text-[11px] text-neutral-600">
                {booking.shopPhone || "No phone"}
              </p>
              <Link
                href={`/admin/shops/${booking.shopId}`}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 hover:underline"
              >
                View shop admin <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>

          {/* Booking Lifecycle Events Timeline */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold tracking-wider text-neutral-900 uppercase">
              Lifecycle Event History
            </h4>
            <div className="relative space-y-4 border-l-2 border-neutral-200 pl-6">
              {booking.events.length === 0 ? (
                <p className="text-neutral-500 italic">No transition events recorded.</p>
              ) : (
                booking.events.map((ev) => (
                  <div key={ev.id} className="relative">
                    <div className="absolute top-1 -left-[31px] size-3 rounded-full border-2 border-white bg-green-600 shadow-2xs" />
                    <div>
                      <span className="font-bold text-neutral-900 capitalize">
                        {ev.fromStatus ? `${ev.fromStatus} → ${ev.toStatus}` : ev.toStatus}
                      </span>
                      <span className="ml-2 text-[10px] text-neutral-500">
                        {formatDateTime(ev.createdAt)}
                      </span>
                      {ev.actorName && (
                        <p className="text-[11px] text-neutral-600">by {ev.actorName}</p>
                      )}
                      {ev.reason && (
                        <p className="mt-0.5 rounded bg-neutral-100 p-1.5 text-[11px] text-neutral-700 italic">
                          Reason: {ev.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Associated Disputes if any */}
          {booking.disputes.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-rose-800 uppercase">
                <AlertTriangle className="size-3.5 text-rose-600" /> Active Disputes (
                {booking.disputes.length})
              </span>
              <div className="mt-2 space-y-2">
                {booking.disputes.map((disp) => (
                  <div key={disp.id} className="rounded-lg border border-rose-200/80 bg-white p-3">
                    <p className="font-semibold text-neutral-900">{disp.reason}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Reported by {disp.reporterName}</span>
                      <span className="font-bold text-rose-700 capitalize">{disp.status}</span>
                    </div>
                    {disp.resolution && (
                      <p className="mt-1 border-t border-neutral-100 pt-1 text-[11px] text-emerald-800">
                        Resolution: {disp.resolution}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages (Read permission for disputed bookings) */}
          {booking.messages.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-neutral-900 uppercase">
                <MessageSquare className="size-3.5" /> Disputed Chat Messages (
                {booking.messages.length})
              </h4>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                {booking.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-neutral-200/60 bg-white p-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="font-bold text-neutral-900">{msg.senderName}</span>
                      <span>{formatDateTime(msg.createdAt)}</span>
                    </div>
                    {msg.body && <p className="mt-1 text-xs text-neutral-800">{msg.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
