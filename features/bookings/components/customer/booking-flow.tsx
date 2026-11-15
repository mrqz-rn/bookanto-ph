"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getOpenSlots } from "@/features/availability/actions";
import type { BookingType } from "@/lib/db/schema/enums";

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
const card = "rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-6";

/** A key per booking attempt, so a double tap or a retry makes one booking. */
const newKey = () => crypto.randomUUID().replaceAll("-", "");

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

  const loginHref = `/login?next=${encodeURIComponent(`/book/${service.id}`)}`;
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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
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

  const ready =
    isQueue ||
    (!!slot && (!isHome || address.trim().length > 0) && (!isQuote || notes.trim().length > 0));

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {isQueue ? (
        <section className={card} aria-labelledby="queue-title">
          <h2 id="queue-title" className="font-display text-xl font-bold text-navy-900">
            Today&apos;s queue
          </h2>
          <p className="mt-2 text-slate-600">
            {service.waiting === 0
              ? "No one is waiting right now. Next ka na!"
              : `${service.waiting} ${service.waiting === 1 ? "person is" : "people are"} waiting right now.`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Get a number now and head to the shop. The shop confirms your number within 30 minutes.
          </p>
        </section>
      ) : (
        <section className={card} aria-labelledby="time-title">
          <h2 id="time-title" className="font-display text-xl font-bold text-navy-900">
            {isQuote ? "When would you like it done?" : "Pick a day and time"}
          </h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">Times are Philippine time.</p>
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
            }}
          />
        </section>
      )}

      <section className={card} aria-labelledby="details-title">
        <h2 id="details-title" className="font-display text-xl font-bold text-navy-900">
          Details
        </h2>
        <div className="mt-4 space-y-4">
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
              />
              <p id="book-address-help" className="mt-1 text-xs text-slate-600">
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
            />
            {fieldErrors.notes?.[0] && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.notes[0]}</p>
            )}
          </div>
        </div>
      </section>

      <section className={card} aria-labelledby="review-title">
        <h2 id="review-title" className="font-display text-xl font-bold text-navy-900">
          Review
        </h2>
        <dl className="mt-3 divide-y divide-border text-sm">
          <Row term="Service" value={`${service.name} · ${service.durationMin} min`} />
          <Row term="Shop" value={service.shopName} />
          <Row
            term="When"
            value={isQueue ? "Today, in turn" : (slot?.label ?? "Pick a time above")}
          />
          <Row term="Price" value={isQuote ? "The shop will send a quote" : service.priceLabel} />
          {service.depositLabel && !isQueue && (
            <Row term="Pay online" value={`${service.depositLabel} after the shop confirms`} />
          )}
        </dl>
        <p className="mt-3 text-sm text-slate-600">
          {isQueue
            ? "You can give up your number anytime."
            : `The shop confirms your request, usually within 2 hours. ${service.cancelNote}`}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {signedIn ? (
          <Button type="submit" size="lg" disabled={pending || !ready} className="mt-4 w-full">
            {pending
              ? "Sending…"
              : isQueue
                ? "Get a queue number"
                : isQuote
                  ? "Ask for a quote"
                  : "Book na"}
          </Button>
        ) : (
          <Button asChild size="lg" className="mt-4 w-full">
            <Link href={loginHref}>Log in to book</Link>
          </Button>
        )}
      </section>
    </form>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-slate-600">{term}</dt>
      <dd className="text-right font-medium text-navy-900">{value}</dd>
    </div>
  );
}
