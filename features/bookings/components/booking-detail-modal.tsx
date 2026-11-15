"use client";

import * as React from "react";
import { CheckCircle2, Clock, Loader2, MapPin, Phone, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";
import { acceptBooking, assignStaff, completeBooking, markNoShow } from "../actions";
import type { BookingListItem } from "../constants";
import { BookingStatusBadge } from "./booking-status-badge";
import { CancelDialog } from "./cancel-dialog";
import { DeclineDialog } from "./decline-dialog";

type BookingDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingListItem | null;
  shopStaff: Array<{ userId: string; name: string; role: string }>;
  onActionComplete?: () => void;
};

export function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  shopStaff,
  onActionComplete,
}: BookingDetailModalProps) {
  const [selectedStaffId, setSelectedStaffId] = React.useState(booking?.staffId || "");
  const [loading, setLoading] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [showDecline, setShowDecline] = React.useState(false);
  const [showCancel, setShowCancel] = React.useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (booking) {
      setSelectedStaffId(booking.staffId || "");
      setActionSuccessMessage(null);
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleAccept = async () => {
    setLoading(true);
    const res = await acceptBooking({
      bookingId: booking.id,
      staffId: selectedStaffId || null,
    });
    setLoading(false);
    if (res.ok) {
      setActionSuccessMessage("Booking accepted and confirmed!");
      onActionComplete?.();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const res = await completeBooking({ bookingId: booking.id });
    setLoading(false);
    if (res.ok) {
      setActionSuccessMessage("Appointment marked as completed!");
      onActionComplete?.();
    }
  };

  const handleNoShow = async () => {
    setLoading(true);
    const res = await markNoShow({ bookingId: booking.id });
    setLoading(false);
    if (res.ok) {
      setActionSuccessMessage("Customer marked as no-show.");
      onActionComplete?.();
    }
  };

  const handleAssignStaff = async (newStaffId: string) => {
    setSelectedStaffId(newStaffId);
    if (!newStaffId) return;

    setAssigning(true);
    const res = await assignStaff({
      bookingId: booking.id,
      staffId: newStaffId,
    });
    setAssigning(false);
    if (res.ok) {
      onActionComplete?.();
    }
  };

  const startFormatted = formatManila(booking.startAt, "EEEE, MMMM d, yyyy · h:mm a");
  const endFormatted = booking.endAt ? formatManila(booking.endAt, "h:mm a") : null;

  return (
    <>
      <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-neutral-900">
                {booking.refCode}
              </span>
              <BookingStatusBadge status={booking.status} />
              {booking.isWalkIn && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                  Walk-in
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            {actionSuccessMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {/* Schedule & Service Card */}
            <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-neutral-900">
                    {booking.serviceName}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
                    <Clock className="size-3.5" />
                    <span>
                      {startFormatted} {endFormatted ? `– ${endFormatted}` : ""} (
                      {booking.serviceDurationMin} mins)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-neutral-900">
                    {booking.totalCentavos !== null ? formatPeso(booking.totalCentavos) : "Quote"}
                  </span>
                </div>
              </div>

              {booking.address && (
                <div className="flex items-start gap-1.5 border-t border-neutral-200 pt-1 text-xs text-neutral-600">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-500" />
                  <span>{booking.address}</span>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="space-y-2 rounded-xl border border-neutral-200 p-4">
              <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                Customer Details
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                    {booking.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{booking.customerName}</p>
                    {booking.customerPhone ? (
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                      >
                        <Phone className="size-3" />
                        {booking.customerPhone}
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">No phone provided</span>
                    )}
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-2 rounded-lg bg-neutral-100/70 p-2.5 text-xs text-neutral-700">
                  <span className="font-semibold text-neutral-900">Notes:</span> {booking.notes}
                </div>
              )}
            </div>

            {/* Assigned Staff */}
            <div className="space-y-2 rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Assigned Team Member
                </span>
                {assigning && (
                  <span className="animate-pulse text-[10px] text-neutral-500">Saving...</span>
                )}
              </div>
              <select
                value={selectedStaffId}
                onChange={(e) => handleAssignStaff(e.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-xs text-neutral-900 outline-none"
              >
                <option value="">Unassigned</option>
                {shopStaff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Bar */}
            <div className="border-t border-neutral-200 pt-2">
              {booking.status === "requested" && (
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDecline(true)}
                    className="border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    <XCircle className="mr-1.5 size-4" />
                    Decline Request
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading}
                    onClick={handleAccept}
                    className="bg-green-600 text-xs font-bold text-white hover:bg-green-500"
                  >
                    {loading ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 size-4" />
                    )}
                    Accept & Confirm
                  </Button>
                </div>
              )}

              {booking.status === "confirmed" && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancel(true)}
                      className="text-xs text-neutral-600 hover:bg-neutral-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNoShow}
                      disabled={loading}
                      className="border-amber-200 text-xs text-amber-800 hover:bg-amber-50"
                    >
                      Mark No-show
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading}
                    onClick={handleComplete}
                    className="bg-teal-600 text-xs font-bold text-white hover:bg-teal-500"
                  >
                    {loading ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 size-4" />
                    )}
                    Complete Service
                  </Button>
                </div>
              )}

              {["completed", "declined", "cancelled", "no_show"].includes(booking.status) && (
                <div className="py-2 text-center text-xs font-medium text-neutral-500">
                  This booking is finalized ({booking.status}).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeclineDialog
        isOpen={showDecline}
        onClose={() => setShowDecline(false)}
        bookingId={booking.id}
        refCode={booking.refCode}
        onSuccess={() => {
          onActionComplete?.();
          onClose();
        }}
      />

      <CancelDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        bookingId={booking.id}
        refCode={booking.refCode}
        onSuccess={() => {
          onActionComplete?.();
          onClose();
        }}
      />
    </>
  );
}
