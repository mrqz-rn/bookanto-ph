"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBookingFunnelTracker } from "@/features/analytics/hooks";
import { getOpenSlots } from "@/features/availability/actions";
import type { BookingType } from "@/lib/db/schema/enums";

import { CUSTOMER_BOOKING_MODES } from "../../booking-modes";
import { createBooking, joinQueue } from "../../customer-actions";
import { ADDRESS_MAX, NOTES_MAX } from "../../rules";
import { SlotPicker } from "./slot-picker";

export type FlowService = {
  id: string;
  name: string;
  bookingType: BookingType;
  /** "₱150", "From ₱150" or "Get a quote" */
  priceLabel: string;
  durationMin: number;
  shopName: string;
  staff: Array<{ userId: string; name: string }>;
  /** Queue services: people waiting now. */
  waiting: number;
  /** What the shop asks for online once it confirms, already formatted; null for nothing. */
  depositLabel: string | null;
  /** "Free to cancel up to 2 hours before." */
  cancelNote: string;
  photos?: Array<{ id: string; path: string; url: string }>;
};

type Props = {
  service: FlowService;
  today: string;
  signedIn: boolean;
  savedAddresses: Array<{ id: string; label: string; text: string }>;
};

const fieldLabel = "mb-1 block text-sm font-medium text-navy-900";
const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
// Keeps a focused field clear of the sticky action bar.
const clearOfBar = "scroll-mb-32";

/** A key per booking attempt, so a double tap or a retry makes one booking. */
const newKey = () => crypto.randomUUID().replaceAll("-", "");

/** What still blocks sending, in the words the action bar shows; null when ready. */
export function missingStep(input: {
  bookingType: BookingType;
  hasSlot: boolean;
  address: string;
  notes: string;
}): string | null {
  const { bookingType, hasSlot, address, notes } = input;
  if (bookingType === "queue") return null;
  if (!hasSlot) return bookingType === "quote" ? "Pick a preferred time" : "Pick a time";
  if (bookingType === "home" && address.trim().length === 0) return "Add your address";
  if (bookingType === "quote" && notes.trim().length === 0) return "Describe the job";
  return null;
}

export function BookingFlow({ service, today, signedIn, savedAddresses }: Props) {
  const router = useRouter();
  const [staffId, setStaffId] = React.useState("");
  const [slot, setSlot] = React.useState<{ startAt: string; label: string } | null>(null);
  const [address, setAddress] = React.useState(savedAddresses[0]?.text ?? "");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [reloads, setReloads] = React.useState(0);
  const [pending, startTransition] = React.useTransition();
  const key = React.useRef(newKey());

  const { trackStep } = useBookingFunnelTracker({
    serviceId: service.id,
    serviceName: service.name,
    initialStep: "select_service",
  });

  const loginHref = `/login?next=${encodeURIComponent(`/book/${service.id}`)}`;
  const mode = CUSTOMER_BOOKING_MODES[service.bookingType];
  const isQueue = service.bookingType === "queue";
  const isHome = service.bookingType === "home";
  const isQuote = service.bookingType === "quote";

  const fail = (result: { code: string; message: string; fieldErrors?: typeof fieldErrors }) => {
    setFieldErrors(result.fieldErrors ?? {});
    setError(result.message);
    if (result.code === "CONFLICT") {
      // The time was just taken: show fresh times.
      setSlot(null);
      setReloads((count) => count + 1);
    }
    if (result.code === "UNAUTHENTICATED") router.push(loginHref);
  };

  const missing = missingStep({
    bookingType: service.bookingType,
    hasSlot: !!slot,
    address,
    notes,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (missing || pending) return;
    setError(null);
    setFieldErrors({});
    trackStep("submit_booking", "booking_submitted", {
      bookingType: service.bookingType,
      isHome,
      isQuote,
      isQueue,
    });
    startTransition(async () => {
      if (isQueue) {
        const result = await joinQueue({
          serviceId: service.id,
          notes,
          idempotencyKey: key.current,
        });
        if (result.ok) router.push(`/account/bookings/${result.data.bookingId}?new=1`);
        else fail(result);
        return;
      }
      if (!slot) return;
      const result = await createBooking({
        serviceId: service.id,
        startAt: slot.startAt,
        staffId: staffId || null,
        address: isHome ? address : null,
        notes,
        idempotencyKey: key.current,
      });
      if (result.ok) router.push(`/account/bookings/${result.data.bookingId}?new=1`);
      else fail(result);
    });
  };

  const when = isQueue ? "Today, in turn" : (slot?.label ?? null);
  // "Sat, Nov 21 · 10:30 AM" splits over the bar's two lines.
  const [whenDay, whenTime] = (when ?? "").split(" · ");
  const detailsDone =
    (!isHome || address.trim().length > 0) && (!isQuote || notes.trim().length > 0);

  return (
    <form onSubmit={submit} noValidate>
      {isQueue ? (
        <Step number={1} title="Today's queue" id="queue-title" done>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-5xl leading-none font-bold text-navy-900 tabular-nums">
              {service.waiting}
            </span>
            <span className="font-semibold text-navy-900">
              {service.waiting === 1 ? "person" : "people"} waiting now
            </span>
          </p>
          <p className="mt-3 text-slate-600">
            {service.waiting === 0
              ? "No one is in line. Next ka na!"
              : "Get a number now and head to the shop when your turn is near."}{" "}
            The shop confirms your number within 30 minutes.
          </p>
        </Step>
      ) : (
        <Step
          number={1}
          title={isQuote ? "When would you like it done?" : "Pick a day and time"}
          id="time-title"
          done={!!slot}
        >
          <p className="-mt-2 mb-4 text-sm text-slate-600">All times are Philippine time.</p>
          {service.staff.length > 0 && (
            <div className="mb-4">
              <label htmlFor="book-staff" className={fieldLabel}>
                With
              </label>
              <select
                id="book-staff"
                value={staffId}
                onChange={(event) => {
                  setStaffId(event.target.value);
                  setSlot(null);
                  key.current = newKey();
                }}
                className={selectClass}
              >
                <option value="">Anyone available</option>
                {service.staff.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <SlotPicker
            today={today}
            load={() =>
              getOpenSlots({
                serviceId: service.id,
                date: today,
                days: 14,
                staffId: staffId || null,
              })
            }
            reloadKey={`${staffId}:${reloads}`}
            value={slot?.startAt ?? null}
            onChange={(startAt, label) => {
              setSlot(startAt && label ? { startAt, label } : null);
              key.current = newKey();
              setError(null);
              if (startAt) {
                trackStep("select_slot", "slot_selected", { startAt, label });
              }
            }}
          />
        </Step>
      )}

      <Step number={2} title="Details" id="details-title" done={detailsDone && !!when}>
        <div className="space-y-4">
          {isHome && (
            <div>
              <label htmlFor="book-address" className={fieldLabel}>
                Where should they go?
              </label>
              {savedAddresses.length > 0 && (
                <select
                  aria-label="Use a saved address"
                  className={`${selectClass} mb-2`}
                  value={savedAddresses.find((entry) => entry.text === address)?.id ?? ""}
                  onChange={(event) => {
                    const saved = savedAddresses.find((entry) => entry.id === event.target.value);
                    setAddress(saved?.text ?? "");
                  }}
                >
                  {savedAddresses.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                  <option value="">Another address</option>
                </select>
              )}
              <Textarea
                id="book-address"
                rows={2}
                maxLength={ADDRESS_MAX}
                required
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="House no., street, barangay, city, and a landmark"
                aria-invalid={!!fieldErrors.address}
                aria-describedby="book-address-help"
                className={clearOfBar}
              />
              <p
                id="book-address-help"
                className={`mt-1 text-sm ${fieldErrors.address ? "text-danger" : "text-slate-600"}`}
              >
                {fieldErrors.address?.[0] ??
                  "The shop sees your exact address only after it accepts your booking."}
              </p>
            </div>
          )}
          <div>
            <label htmlFor="book-notes" className={fieldLabel}>
              {isQuote ? "What do you need done?" : "Notes for the shop"}{" "}
              {!isQuote && <span className="font-normal text-slate-600">(optional)</span>}
            </label>
            <Textarea
              id="book-notes"
              rows={3}
              maxLength={NOTES_MAX}
              required={isQuote}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                isQuote
                  ? "e.g. 2 split-type aircons, 1.5 HP each, not cleaned for a year"
                  : "Anything the shop should know"
              }
              aria-invalid={!!fieldErrors.notes}
              aria-describedby={fieldErrors.notes ? "book-notes-error" : undefined}
              className={clearOfBar}
            />
            {isQuote && !fieldErrors.notes && (
              <p className="mt-1 text-sm text-slate-600">
                The more detail you give, the closer the quote.
              </p>
            )}
            {fieldErrors.notes?.[0] && (
              <p id="book-notes-error" className="mt-1 text-sm text-danger">
                {fieldErrors.notes[0]}
              </p>
            )}
          </div>
        </div>
      </Step>

      <Step number={3} title="Review" id="review-title" done={!missing}>
        <dl className="divide-y divide-border text-sm">
          <Row
            term="Service"
            value={isQuote ? service.name : `${service.name} · ${service.durationMin} min`}
          />
          <Row term="Shop" value={service.shopName} />
          <Row term="When" value={when ?? "Pick a time above"} muted={!when} />
          <Row term="Price" value={isQuote ? "The shop will send a quote" : service.priceLabel} />
          {service.depositLabel && !isQueue && (
            <Row term="Pay online" value={`${service.depositLabel} after the shop confirms`} />
          )}
        </dl>
        <p className="mt-3 text-sm text-slate-600">
          {isQueue
            ? "You can give up your number anytime."
            : isQuote
              ? `Nothing is booked until you accept the shop's quote. ${service.cancelNote}`
              : `This is a request: the shop confirms it, usually within 2 hours. ${service.cancelNote}`}
        </p>
      </Step>

      {/* Always in reach of the thumb: what's chosen, what's missing, and the one action. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm" aria-live="polite">
            <p className={missing ? "text-slate-600" : "font-semibold text-navy-900"}>
              {missing ?? whenDay}
            </p>
            <p className="font-semibold text-navy-900">
              {!missing && whenTime && <>{whenTime} · </>}
              {isQuote ? "Price by quote" : service.priceLabel}
            </p>
          </div>
          {signedIn ? (
            <Button
              type="submit"
              disabled={pending || !!missing}
              aria-busy={pending || undefined}
              className="shrink-0"
            >
              {pending ? "Sending…" : mode.submit}
            </Button>
          ) : (
            <Button asChild className="shrink-0">
              <Link href={loginHref}>Log in to book</Link>
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function Step({
  number,
  title,
  id,
  done,
  children,
}: {
  number: number;
  title: string;
  id: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-t border-border py-6 first:border-t-0 first:pt-2"
    >
      <h2
        id={id}
        className="mb-4 flex items-center gap-3 font-display text-xl font-bold text-navy-900"
      >
        <span
          aria-hidden="true"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold ${
            done ? "bg-green-700 text-white" : "bg-navy-900 text-white"
          }`}
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <span>
          <span className="sr-only">Step {number}: </span>
          {title}
        </span>
      </h2>
      {children}
    </section>
  );
}

function Row({ term, value, muted }: { term: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-slate-600">{term}</dt>
      <dd className={`text-right font-medium ${muted ? "text-slate-600" : "text-navy-900"}`}>
        {value}
      </dd>
    </div>
  );
}
