"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  MapPin,
  RefreshCw,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
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
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { SlotPicker } from "@/features/bookings/components/customer/slot-picker";
import { formatPeso } from "@/lib/money";
import { formatManila, manilaDate } from "@/lib/time";

type Props = {
  booking: MyBookingDetail;
  isNew?: boolean;
};

const card = "rounded-xl border border-border bg-card p-5 shadow-2xs sm:p-6";

export function CustomerBookingView({ booking, isNew }: Props) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(
    isNew ? "Your booking request has been submitted successfully!" : null,
  );
  const [pending, startTransition] = React.useTransition();

  // Dialog States
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  const [showRescheduleDialog, setShowRescheduleDialog] = React.useState(false);
  const [rescheduleSlot, setRescheduleSlot] = React.useState<{
    startAt: string;
    label: string;
  } | null>(null);

  const copyRefCode = () => {
    navigator.clipboard.writeText(booking.refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            ? "Booking cancelled inside the cancellation window."
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
    booking.rescheduleCount < booking.rules.maxReschedules;

  const dueOnline = Math.max(0, booking.depositCentavos - booking.paidCentavos);
  const canPayOnline = booking.status === "confirmed" && dueOnline > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      {/* Back to Bookings Navigation */}
      <div>
        <Link
          href="/account/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900"
        >
          <ArrowLeft className="size-4" />
          Back to all bookings
        </Link>
      </div>

      {/* Alert Messages */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-800">
          <CheckCircle2 className="size-5 shrink-0 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800">
          <AlertCircle className="size-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Booking Header Card */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-navy-900">{booking.refCode}</span>
            <button
              type="button"
              onClick={copyRefCode}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Copy reference code"
            >
              <Copy className="size-4" />
            </button>
            {copied && <span className="text-xs text-green-700">Copied!</span>}
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="mt-4">
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {booking.serviceName}
          </h1>
          <p className="mt-1 text-base text-slate-700">
            at{" "}
            <Link
              href={`/shop/${booking.shopSlug}`}
              className="font-semibold text-green-700 hover:underline"
            >
              {booking.shopName}
            </Link>
          </p>
        </div>

        {/* Queue Tracker Highlight */}
        {booking.bookingType === "queue" && booking.queueNumber !== null && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50/70 p-5 text-center">
            <span className="text-xs font-bold tracking-wider text-green-800 uppercase">
              Your Queue Number
            </span>
            <div className="mt-1 font-display text-5xl font-black text-green-800">
              #{booking.queueNumber}
            </div>
            <p className="mt-2 text-sm font-medium text-green-900">
              {booking.ahead === 0
                ? "You are next in line! Head to the counter."
                : booking.ahead !== null
                  ? `${booking.ahead} ${booking.ahead === 1 ? "person is" : "people are"} ahead of you.`
                  : "Waiting for shop confirmation."}
            </p>
          </div>
        )}

        {/* Appointment Details Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {booking.bookingType !== "queue" && (
            <div className="flex items-start gap-3">
              <Calendar className="size-5 shrink-0 text-slate-400" />
              <div>
                <span className="block font-medium text-slate-500">Date & Time</span>
                <span className="font-semibold text-navy-900">
                  {formatManila(booking.startAt, "EEE, MMM d, yyyy · h:mm a")}
                </span>
              </div>
            </div>
          )}

          {booking.staffName && (
            <div className="flex items-start gap-3">
              <User className="size-5 shrink-0 text-slate-400" />
              <div>
                <span className="block font-medium text-slate-500">Specialist</span>
                <span className="font-semibold text-navy-900">{booking.staffName}</span>
              </div>
            </div>
          )}

          {booking.bookingType === "home" && booking.address && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <MapPin className="size-5 shrink-0 text-slate-400" />
              <div>
                <span className="block font-medium text-slate-500">Service Location</span>
                <span className="font-semibold text-navy-900">{booking.address}</span>
              </div>
            </div>
          )}

          {booking.shopAddress && booking.bookingType !== "home" && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <MapPin className="size-5 shrink-0 text-slate-400" />
              <div>
                <span className="block font-medium text-slate-500">Shop Address</span>
                <span className="font-semibold text-navy-900">{booking.shopAddress}</span>
              </div>
            </div>
          )}

          {booking.notes && (
            <div className="flex items-start gap-3 border-t border-border pt-3 sm:col-span-2">
              <div>
                <span className="block font-medium text-slate-500">Your Instructions / Notes</span>
                <p className="mt-0.5 text-slate-700">{booking.notes}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quote Banner & Accept Action */}
      {booking.status === "quoted" && booking.quotedPriceCentavos !== null && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-700" />
            <h2 className="font-display text-lg font-bold text-amber-950">Quotation Ready</h2>
          </div>
          <p className="mt-1 text-sm text-amber-900">
            The shop has quoted <strong>{formatPeso(booking.quotedPriceCentavos)}</strong> for this
            service.
          </p>
          {booking.expiresAt && (
            <p className="mt-1 text-xs text-amber-800">
              Valid until {formatManila(booking.expiresAt, "MMM d, h:mm a")}.
            </p>
          )}
          <div className="mt-4">
            <Button onClick={handleAcceptQuote} disabled={pending} className="w-full sm:w-auto">
              Accept Quote ({formatPeso(booking.quotedPriceCentavos)})
            </Button>
          </div>
        </section>
      )}

      {/* Payment & Deposit Section */}
      {(booking.totalCentavos !== null || booking.depositCentavos > 0) && (
        <section className={card}>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-display text-lg font-bold text-navy-900">Payment Summary</h2>
            <CreditCard className="size-5 text-slate-400" />
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {booking.totalCentavos !== null && (
              <div className="flex justify-between">
                <span className="text-slate-600">Total Service Price</span>
                <span className="font-semibold text-navy-900">
                  {formatPeso(booking.totalCentavos)}
                </span>
              </div>
            )}

            {booking.depositCentavos > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Required Deposit</span>
                <span className="font-semibold text-navy-900">
                  {formatPeso(booking.depositCentavos)}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-slate-600">Paid Online</span>
              <span className="font-semibold text-green-700">
                {formatPeso(booking.paidCentavos)}
              </span>
            </div>

            {dueOnline > 0 && (
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-navy-900">
                <span>Balance Due</span>
                <span>{formatPeso(dueOnline)}</span>
              </div>
            )}
          </div>

          {canPayOnline && (
            <div className="mt-5 border-t border-border pt-4">
              <Button
                onClick={handleStartPayment}
                disabled={pending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Pay Deposit Now ({formatPeso(dueOnline)})
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Customer Action Controls (Cancel / Reschedule) */}
      {(canCancel || canReschedule) && (
        <div className="flex flex-wrap gap-3">
          {canReschedule && (
            <Button
              variant="outline"
              onClick={() => setShowRescheduleDialog(true)}
              className="flex-1"
            >
              <RefreshCw className="mr-1.5 size-4" />
              Reschedule
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <XCircle className="mr-1.5 size-4" />
              Cancel Booking
            </Button>
          )}
        </div>
      )}

      {/* Booking Lifecycle Events Timeline */}
      {booking.events.length > 0 && (
        <section className={card}>
          <h2 className="mb-4 font-display text-lg font-bold text-navy-900">Booking Activity</h2>
          <ol className="relative ml-3 space-y-4 border-l border-slate-200">
            {booking.events.map((event) => (
              <li key={event.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-white bg-green-600" />
                <time className="text-xs font-normal text-slate-500">
                  {formatManila(event.createdAt, "MMM d, yyyy · h:mm a")}
                </time>
                <p className="text-sm font-semibold text-navy-900">
                  Status changed to{" "}
                  <span className="capitalize">{event.toStatus.replace("_", " ")}</span>
                  {event.by === "you" ? " by you" : event.by === "shop" ? " by shop" : " by system"}
                </p>
                {event.reason && (
                  <p className="mt-0.5 text-xs text-slate-600">Reason: {event.reason}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Cancel Modal Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-navy-900">Cancel Appointment?</h3>
            {booking.rules.cancelWindowHours > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                {booking.shopName}&apos;s policy requires at least{" "}
                <strong>{booking.rules.cancelWindowHours} hours</strong> notice.
              </p>
            )}

            <form onSubmit={handleCancelBooking} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="cancel-reason"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Reason (optional)
                </label>
                <Textarea
                  id="cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell the shop why you need to cancel..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={pending}
                >
                  Keep Booking
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {pending ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal Dialog */}
      {showRescheduleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-navy-900">Reschedule Appointment</h3>
            <p className="mt-1 text-sm text-slate-600">
              Pick a new day and available time slot for your service.
            </p>

            <div className="mt-4">
              <SlotPicker
                load={() =>
                  getRescheduleSlots({
                    bookingId: booking.id,
                    fromDate: manilaDate(new Date()),
                    toDate: manilaDate(new Date(Date.now() + 14 * 86_400_000)),
                    staffId: null,
                  })
                }
                reloadKey={booking.id}
                value={rescheduleSlot?.startAt ?? null}
                onChange={(startAt, label) => {
                  setRescheduleSlot(startAt && label ? { startAt, label } : null);
                }}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRescheduleDialog(false)}
                disabled={pending}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleReschedule}
                disabled={!rescheduleSlot || pending}
                className="bg-green-600 hover:bg-green-700"
              >
                {pending ? "Rescheduling..." : "Confirm New Slot"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
