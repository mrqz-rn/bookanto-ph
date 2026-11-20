"use client";

import { AlertCircle, CheckCircle2, CreditCard, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptQuote,
  cancelMyBooking,
  getRescheduleSlots,
  rescheduleBooking,
  startPayment,
} from "@/features/bookings/customer-actions";
import type { MyBookingDetail } from "@/features/bookings/customer-queries";
import { SlotPicker } from "@/features/bookings/components/customer/slot-picker";
import { formatPeso } from "@/lib/money";
import { formatManila, manilaDate } from "@/lib/time";

type Props = {
  booking: MyBookingDetail;
};

export function CustomerBookingActions({ booking }: Props) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  const [showRescheduleDialog, setShowRescheduleDialog] = React.useState(false);
  const [rescheduleSlot, setRescheduleSlot] = React.useState<{
    startAt: string;
    label: string;
  } | null>(null);
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(null);

  const handleAcceptQuote = () => {
    setError(null);
    startTransition(async () => {
      const res = await acceptQuote({ bookingId: booking.id });
      if (res.ok) {
        setSuccess("Quote accepted! Your booking is now confirmed.");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const handleStartPayment = () => {
    setError(null);
    startTransition(async () => {
      const res = await startPayment({ bookingId: booking.id });
      if (res.ok) {
        window.location.href = res.data.url;
      } else {
        setError(res.message);
      }
    });
  };

  const handleCancelBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await cancelMyBooking({
        bookingId: booking.id,
        reason: cancelReason.trim() || undefined,
      });
      if (res.ok) {
        setShowCancelDialog(false);
        setSuccess(
          res.data.late
            ? "Booking cancelled inside the shop's cancellation window."
            : "Booking cancelled successfully.",
        );
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const handleReschedule = () => {
    if (!rescheduleSlot) return;
    setError(null);
    setRescheduleError(null);
    startTransition(async () => {
      const res = await rescheduleBooking({
        bookingId: booking.id,
        startAt: rescheduleSlot.startAt,
      });
      if (res.ok) {
        setShowRescheduleDialog(false);
        setSuccess("Appointment rescheduled successfully!");
        router.refresh();
      } else {
        setRescheduleError(res.message);
        setError(res.message);
      }
    });
  };

  const isFinal = ["completed", "declined", "cancelled", "no_show", "expired"].includes(
    booking.status,
  );

  const canCancel = !isFinal;
  const canReschedule =
    !isFinal &&
    booking.bookingType !== "queue" &&
    booking.rescheduleCount < (booking.rules?.maxReschedules ?? 2);

  const dueOnline = Math.max(0, (booking.depositCentavos || 0) - (booking.paidCentavos || 0));
  const canPayOnline = booking.status === "confirmed" && dueOnline > 0;

  return (
    <div className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800">
          <AlertCircle className="size-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Quote Banner */}
      {booking.status === "quoted" && booking.quotedPriceCentavos !== null && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <Sparkles className="size-4 text-amber-700" />
            <span>Quotation from Shop</span>
          </div>
          <div className="mt-1 text-base font-bold text-amber-950">
            {formatPeso(booking.quotedPriceCentavos)}
          </div>
          {booking.expiresAt && (
            <p className="mt-1 text-[11px] text-amber-700">
              Valid until {formatManila(booking.expiresAt, "MMM d, h:mm a")}.
            </p>
          )}
          <Button
            size="sm"
            onClick={handleAcceptQuote}
            disabled={pending}
            className="mt-3 w-full bg-amber-600 text-xs font-semibold hover:bg-amber-700"
          >
            Accept Quote ({formatPeso(booking.quotedPriceCentavos)})
          </Button>
        </div>
      )}

      {/* Deposit Payment Banner */}
      {canPayOnline && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>Online Deposit Required</span>
            <CreditCard className="size-4 text-emerald-700" />
          </div>
          <div className="mt-1 text-base font-bold text-emerald-950">{formatPeso(dueOnline)}</div>
          <p className="mt-0.5 text-[11px] text-emerald-700">
            Secure checkout via PayMongo (GCash, Maya, Cards).
          </p>
          <Button
            size="sm"
            onClick={handleStartPayment}
            disabled={pending}
            className="mt-3 w-full bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Pay Deposit Now ({formatPeso(dueOnline)})
          </Button>
        </div>
      )}

      {/* Reschedule & Cancel Action Buttons */}
      {(canCancel || canReschedule) && (
        <div className="flex gap-2">
          {canReschedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRescheduleError(null);
                setRescheduleSlot(null);
                setShowRescheduleDialog(true);
              }}
              className="flex-1 text-xs"
            >
              <RefreshCw className="mr-1 size-3.5" />
              Reschedule
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="flex-1 border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <XCircle className="mr-1 size-3.5" />
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-neutral-900">Cancel Appointment?</h3>
            <p className="mt-1 text-xs text-neutral-600">
              Are you sure you want to cancel this booking with {booking.shopName}?
            </p>

            <form onSubmit={handleCancelBooking} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="modal-cancel-reason"
                  className="mb-1 block text-xs font-medium text-neutral-700"
                >
                  Reason (optional)
                </label>
                <Textarea
                  id="modal-cancel-reason"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell the shop why..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={pending}
                  className="text-xs"
                >
                  Keep
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending}
                  className="bg-red-600 text-xs text-white hover:bg-red-700"
                >
                  {pending ? "Cancelling..." : "Confirm Cancel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-neutral-900">Pick a New Slot</h3>
            <p className="mt-1 text-xs text-neutral-600">
              Select an available appointment time for {booking.serviceName}.
            </p>

            {rescheduleError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="mt-3">
              <SlotPicker
                today={manilaDate(new Date())}
                load={() =>
                  getRescheduleSlots({
                    bookingId: booking.id,
                    date: manilaDate(new Date()),
                    days: 14,
                  })
                }
                reloadKey={booking.id}
                value={rescheduleSlot?.startAt ?? null}
                onChange={(startAt, label) => {
                  setRescheduleError(null);
                  setRescheduleSlot(startAt && label ? { startAt, label } : null);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-neutral-100 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRescheduleDialog(false)}
                disabled={pending}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleReschedule}
                disabled={!rescheduleSlot || pending}
                className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {pending ? "Rescheduling..." : "Confirm Slot"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
