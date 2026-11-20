"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Loader2, MapPin, MessageSquare, Phone, StickyNote, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { formatManila, formatManilaTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { acceptBooking, assignStaff, completeBooking, markNoShow } from "../actions";
import { BOOKING_STATUS_CONFIG, type BookingListItem } from "../constants";
import { canShopComplete, canShopMarkNoShow, TYPE_LABELS } from "../rules";
import {
  acceptVerdict,
  bookingEndMs,
  firstName,
  formatDuration,
  isClosed,
  isQuoteRequest,
  requestDeadline,
} from "../today";
import { BookingStatusBadge } from "./booking-status-badge";
import { CancelDialog } from "./cancel-dialog";
import { DeclineDialog } from "./decline-dialog";
import { FOCUS_RING as FOCUS, PRESS } from "./booking-ui";

type BookingDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingListItem | null;
  shopStaff: Array<{ userId: string; name: string; role: string }>;
  /** After accept, done, no-show, decline or cancel; the message says what happened. */
  onActionComplete?: (message?: string) => void;
  /** After a change that keeps the sheet open (the team member). Falls back to onActionComplete. */
  onUpdated?: () => void;
};

type Action = "accept" | "complete" | "no_show";

const FAILED: Record<Action, string> = {
  accept: "Couldn't accept the booking. Try again.",
  complete: "Couldn't mark the booking done. Try again.",
  no_show: "Couldn't mark the no-show. Try again.",
};

export function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  shopStaff,
  onActionComplete,
  onUpdated,
}: BookingDetailModalProps) {
  const [selectedStaffId, setSelectedStaffId] = React.useState(booking?.staffId || "");
  const [busy, setBusy] = React.useState<Action | null>(null);
  const [assigning, setAssigning] = React.useState(false);
  const [assigned, setAssigned] = React.useState(false);
  const [showDecline, setShowDecline] = React.useState(false);
  const [showCancel, setShowCancel] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (booking) {
      setSelectedStaffId(booking.staffId || "");
      setError(null);
      setAssigned(false);
    }
  }, [booking]);

  const open = isOpen && !!booking;
  const childOpen = showDecline || showCancel;

  const closeLatest = React.useRef(onClose);
  React.useEffect(() => {
    closeLatest.current = onClose;
  });

  // Focus lands on Close once, when the sheet opens.
  React.useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open, booking?.id]);

  // Escape closes the sheet, unless the decline or cancel dialog is on top.
  React.useEffect(() => {
    if (!open || childOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLatest.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, childOpen]);

  if (!open || !booking) return null;

  const nowMs = Date.now();
  const shopSide = {
    status: booking.status,
    bookingType: booking.bookingType ?? "slot",
    startAt: new Date(booking.startAt),
    expiresAt: booking.expiresAt ? new Date(booking.expiresAt) : null,
  };
  const quote = isQuoteRequest(booking);
  const verdict = booking.status === "requested" && !quote ? acceptVerdict(booking, nowMs) : null;
  const deadline = booking.status === "requested" ? requestDeadline(booking, nowMs) : null;
  const complete = canShopComplete(shopSide, new Date(nowMs));
  const noShow = canShopMarkNoShow(shopSide, new Date(nowMs));
  const centavos = booking.totalCentavos ?? booking.quotedPriceCentavos;
  const name = firstName(booking.customerName);

  async function run(action: Action) {
    if (!booking) return;
    setBusy(action);
    setError(null);
    const call =
      action === "accept"
        ? acceptBooking({ bookingId: booking.id, staffId: selectedStaffId || null })
        : action === "complete"
          ? completeBooking({ bookingId: booking.id })
          : markNoShow({ bookingId: booking.id });
    const result = await call;
    setBusy(null);
    if (!result.ok) {
      setError(result.message || FAILED[action]);
      return;
    }
    const when = `${formatManila(booking.startAt, "EEE, MMM d")} at ${formatManilaTime(booking.startAt)}`;
    onActionComplete?.(
      action === "accept"
        ? `Accepted. ${booking.customerName} is booked for ${when}.`
        : action === "complete"
          ? `Marked ${booking.customerName}'s ${booking.serviceName} done.`
          : `Marked ${booking.customerName} as a no-show.`,
    );
  }

  async function handleAssignStaff(newStaffId: string) {
    if (!booking) return;
    setSelectedStaffId(newStaffId);
    setAssigned(false);
    if (!newStaffId) return;
    setAssigning(true);
    setError(null);
    const result = await assignStaff({ bookingId: booking.id, staffId: newStaffId });
    setAssigning(false);
    if (result.ok) {
      setAssigned(true);
      (onUpdated ?? onActionComplete)?.();
    } else {
      setError(result.message || "Couldn't change the team member. Try again.");
    }
  }

  const titleId = `booking-${booking.id}-title`;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 sm:items-center sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 pt-5 pb-4">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-2xl font-bold text-navy-900">
                {booking.serviceName}
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <BookingStatusBadge status={booking.status} />
                {booking.isWalkIn && (
                  <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-semibold text-navy-900">
                    Walk-in
                  </span>
                )}
                <span className="tabular-nums">{booking.refCode}</span>
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-neutral-100 hover:text-navy-900",
                FOCUS,
              )}
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger"
              >
                {error}
              </p>
            )}

            {/* When and how much */}
            <section aria-label="When" className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-slate-600" />
                <div>
                  <p className="text-base font-semibold text-navy-900">
                    {formatManila(booking.startAt, "EEEE, MMMM d")}
                  </p>
                  <p className="text-base text-slate-600 tabular-nums">
                    {formatManilaTime(booking.startAt)} to{" "}
                    {formatManilaTime(new Date(bookingEndMs(booking)))} ·{" "}
                    {formatDuration(booking.serviceDurationMin * 60_000)}
                  </p>
                  {deadline && (
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold",
                        deadline.urgent ? "text-danger" : "text-warning",
                      )}
                    >
                      {deadline.label}
                    </p>
                  )}
                </div>
              </div>
              <p className="shrink-0 font-display text-2xl font-bold text-navy-900 tabular-nums">
                {centavos !== null ? formatPeso(centavos) : "To quote"}
              </p>
            </section>

            {booking.address && (
              <section aria-label="Address" className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">{TYPE_LABELS.home}</p>
                  <p className="text-base text-slate-600">{booking.address}</p>
                </div>
              </section>
            )}

            {/* Customer */}
            <section aria-labelledby={`${titleId}-customer`} className="rounded-xl bg-muted p-4">
              <h3 id={`${titleId}-customer`} className="text-sm font-semibold text-slate-600">
                Customer
              </h3>
              <p className="mt-1 text-lg font-semibold text-navy-900">{booking.customerName}</p>
              {booking.notes && (
                <p className="mt-2 flex items-start gap-2 text-base text-navy-900">
                  <StickyNote aria-hidden className="mt-1 size-4 shrink-0 text-slate-600" />
                  <span>{booking.notes}</span>
                </p>
              )}
              {(booking.customerPhone || booking.customerId) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {booking.customerPhone && (
                    <Button asChild variant="outline" className={cn("bg-white", PRESS)}>
                      <a href={`tel:${booking.customerPhone}`}>
                        <Phone aria-hidden />
                        Call {name}
                      </a>
                    </Button>
                  )}
                  {booking.customerId && (
                    <Button asChild variant="outline" className={cn("bg-white", PRESS)}>
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <MessageSquare aria-hidden />
                        Message {name}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* Team member */}
            {shopStaff.length > 0 && !isClosed(booking) && (
              <section>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`${titleId}-staff`}
                    className="text-sm font-semibold text-navy-900"
                  >
                    Team member
                  </label>
                  <span role="status" className="text-sm text-slate-600">
                    {assigning ? "Saving…" : assigned ? "Saved" : ""}
                  </span>
                </div>
                <select
                  id={`${titleId}-staff`}
                  value={selectedStaffId}
                  onChange={(event) => void handleAssignStaff(event.target.value)}
                  disabled={assigning}
                  className={cn(
                    "mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3 text-base text-navy-900 shadow-xs disabled:opacity-60",
                    FOCUS,
                  )}
                >
                  <option value="">Not assigned yet</option>
                  {shopStaff.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </section>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            {quote && (
              <Button asChild className={cn("w-full", PRESS)}>
                <Link href="/dashboard/quotes">Send a quote</Link>
              </Button>
            )}

            {verdict && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => setShowDecline(true)}
                    className={PRESS}
                  >
                    Decline
                  </Button>
                  <Button
                    type="button"
                    disabled={busy !== null || !verdict.allowed}
                    onClick={() => void run("accept")}
                    className={PRESS}
                  >
                    {busy === "accept" && <Loader2 aria-hidden className="animate-spin" />}
                    Accept
                  </Button>
                </div>
                {!verdict.allowed && (
                  <p className="mt-2 text-sm text-slate-600">{verdict.reason}</p>
                )}
              </>
            )}

            {booking.status === "confirmed" && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_1fr]">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => setShowCancel(true)}
                    className="col-span-2 text-slate-600 sm:col-span-1"
                  >
                    Cancel booking
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy !== null || !noShow.allowed}
                    onClick={() => void run("no_show")}
                    className={PRESS}
                  >
                    {busy === "no_show" && <Loader2 aria-hidden className="animate-spin" />}
                    No-show
                  </Button>
                  <Button
                    type="button"
                    disabled={busy !== null || !complete.allowed}
                    onClick={() => void run("complete")}
                    className={PRESS}
                  >
                    {busy === "complete" && <Loader2 aria-hidden className="animate-spin" />}
                    Mark done
                  </Button>
                </div>
                {!complete.allowed && (
                  <p className="mt-2 text-sm text-slate-600">{complete.reason}</p>
                )}
              </>
            )}

            {booking.status === "quoted" && (
              <p className="text-sm text-slate-600">
                Quote sent. {name} confirms or lets it expire.
              </p>
            )}

            {isClosed(booking) && (
              <p className="text-sm text-slate-600">
                This booking is closed:{" "}
                {BOOKING_STATUS_CONFIG[booking.status]?.label ?? booking.status}.
              </p>
            )}
          </div>
        </div>
      </div>

      <DeclineDialog
        isOpen={showDecline}
        onClose={() => setShowDecline(false)}
        bookingId={booking.id}
        refCode={booking.refCode}
        onSuccess={() => {
          onActionComplete?.(`Declined ${booking.customerName}'s request.`);
          onClose();
        }}
      />

      <CancelDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        bookingId={booking.id}
        refCode={booking.refCode}
        onSuccess={() => {
          onActionComplete?.(`Cancelled ${booking.customerName}'s booking.`);
          onClose();
        }}
      />
    </>
  );
}
