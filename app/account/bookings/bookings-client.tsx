"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  History,
  MapPin,
  MessageSquare,
  Star,
  Ticket,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_CONFIG } from "@/features/bookings/constants";
import type { MyBooking } from "@/features/bookings/customer-queries";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { ReviewFormDialog } from "@/features/reviews/components/review-form-dialog";
import type { PublicReviewItem } from "@/features/reviews/queries";
import { formatPeso } from "@/lib/money";
import { formatManila, manilaDate } from "@/lib/time";

export type BookingsTab = "upcoming" | "review" | "past";

type CustomerBookingsClientProps = {
  upcomingBookings: MyBooking[];
  pastBookings: MyBooking[];
  reviews: Record<string, PublicReviewItem>;
  initialTab: BookingsTab;
  /** Today's Manila date ("yyyy-MM-dd"), from the server so both renders agree. */
  todayKey: string;
  olderHref: string | null;
  newestHref: string | null;
};

type Reviewing = { booking: MyBooking; rating: number } | null;

export function CustomerBookingsClient({
  upcomingBookings,
  pastBookings,
  reviews,
  initialTab,
  todayKey,
  olderHref,
  newestHref,
}: CustomerBookingsClientProps) {
  const [tab, setTab] = React.useState<BookingsTab>(initialTab);
  const [reviewing, setReviewing] = React.useState<Reviewing>(null);

  const toReview = pastBookings.filter((b) => b.status === "completed" && !reviews[b.id]);

  const selectTab = (next: BookingsTab) => {
    setTab(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url);
    } catch {
      // The tab still switches; only the shareable URL is skipped.
    }
  };

  const tabs: { id: BookingsTab; label: string; count: number | null; icon: typeof Clock }[] = [
    { id: "upcoming", label: "Upcoming", count: upcomingBookings.length, icon: CalendarCheck },
    { id: "review", label: "To review", count: toReview.length, icon: Star },
    { id: "past", label: "Past", count: null, icon: History },
  ];

  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    selectTab(tabs[next]!.id);
    document.getElementById(`bookings-tab-${tabs[next]!.id}`)?.focus();
  };

  const openReview = (booking: MyBooking, rating = 0) => setReviewing({ booking, rating });

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Bookings"
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:inline-grid sm:w-auto sm:self-start"
      >
        {tabs.map((t, i) => {
          const selected = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              id={`bookings-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="bookings-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.98] sm:px-4 ${
                selected
                  ? "bg-card text-navy-900 shadow-xs"
                  : "text-slate-600 hover:bg-card/60 hover:text-navy-900"
              }`}
            >
              <Icon className="hidden size-4 sm:block" aria-hidden />
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-xs leading-5 font-bold ${
                    t.id === "review" ? "bg-yellow-400 text-navy-900" : "bg-accent text-green-800"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div id="bookings-panel" role="tabpanel" aria-labelledby={`bookings-tab-${tab}`}>
        {tab === "upcoming" &&
          (upcomingBookings.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {upcomingBookings.map((b, i) => (
                <li key={b.id}>
                  <UpcomingCard booking={b} featured={i === 0} todayKey={todayKey} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarPlus}
              title="No upcoming appointments"
              body="Find a barber, salon, spa or home service near you and pick a time that suits you."
              action={{ href: "/explore", label: "Find a service" }}
            />
          ))}

        {tab === "review" &&
          (toReview.length > 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Your rating helps neighbours choose and tells the shop what went well. Tap a star to
                start.
              </p>
              <ul className="flex flex-col gap-4">
                {toReview.map((b) => (
                  <li key={b.id}>
                    <PastCard booking={b} review={null} onRate={openReview} todayKey={todayKey} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="You're all caught up"
              body="Every completed visit has your rating. New ones show up here after your appointment."
              action={
                upcomingBookings.length === 0 ? { href: "/explore", label: "Find a service" } : null
              }
            />
          ))}

        {tab === "past" &&
          (pastBookings.length > 0 ? (
            <div className="flex flex-col gap-4">
              <ul className="flex flex-col gap-4">
                {pastBookings.map((b) => (
                  <li key={b.id}>
                    <PastCard
                      booking={b}
                      review={reviews[b.id] ?? null}
                      onRate={openReview}
                      todayKey={todayKey}
                    />
                  </li>
                ))}
              </ul>
              {(olderHref || newestHref) && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  {newestHref && (
                    <Button asChild variant="ghost">
                      <Link href={newestHref}>Back to latest bookings</Link>
                    </Button>
                  )}
                  {olderHref && (
                    <Button asChild variant="outline" className="active:scale-[0.98]">
                      <Link href={olderHref}>
                        Show older bookings
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={History}
              title="No past bookings yet"
              body="After your first appointment you'll find it here, with the chat and a spot to rate the shop."
              action={
                upcomingBookings.length === 0 ? { href: "/explore", label: "Find a service" } : null
              }
            />
          ))}
      </div>

      {reviewing && (
        <ReviewFormDialog
          bookingId={reviewing.booking.id}
          shopName={reviewing.booking.shopName}
          serviceName={reviewing.booking.serviceName}
          initialRating={reviewing.rating}
          isOpen
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DateTile({
  startAt,
  muted = false,
  showYear = false,
}: {
  startAt: string;
  muted?: boolean;
  showYear?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`flex h-20 w-16 shrink-0 flex-col items-center justify-center self-start rounded-xl leading-none ${
        muted ? "bg-muted text-slate-600" : "bg-accent text-green-800"
      }`}
    >
      <span className="text-[11px] font-bold tracking-wide uppercase">
        {formatManila(startAt, "EEE")}
      </span>
      <span className="mt-1 font-display text-2xl font-bold text-navy-900">
        {formatManila(startAt, "d")}
      </span>
      <span className="mt-1 text-[11px] font-semibold uppercase">
        {formatManila(startAt, showYear ? "MMM yy" : "MMM")}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: MyBooking["status"] }) {
  const config = BOOKING_STATUS_CONFIG[status];
  const label = status === "requested" ? "Awaiting shop" : config.label;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${config.badgeClass}`}
    >
      <span className={`size-1.5 rounded-full ${config.dotClass}`} aria-hidden />
      {label}
    </span>
  );
}

function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function whenLabel(b: MyBooking, todayKey: string): string {
  const day = manilaDate(b.startAt);
  const dayLabel =
    day === todayKey
      ? "Today"
      : day === addDays(todayKey, 1)
        ? "Tomorrow"
        : formatManila(b.startAt, "EEEE, MMM d");
  if (b.bookingType === "queue") return dayLabel;
  const start = formatManila(b.startAt, "h:mm a");
  const end = b.endAt ? ` – ${formatManila(b.endAt, "h:mm a")}` : "";
  return `${dayLabel} · ${start}${end}`;
}

/** What the customer should know or do next, in one line. */
function nextStep(b: MyBooking): { text: string; tone: "wait" | "act" | "ok" } | null {
  switch (b.status) {
    case "requested":
      return {
        text: b.expiresAt
          ? `The shop has until ${formatManila(b.expiresAt, "h:mm a, MMM d")} to confirm.`
          : "Waiting for the shop to confirm your request.",
        tone: "wait",
      };
    case "quoted":
      return {
        text: "The shop sent you a price. Open it to accept and lock in your slot.",
        tone: "act",
      };
    case "confirmed":
      return {
        text:
          b.bookingType === "queue"
            ? "You're in line. We'll let you know when it's nearly your turn."
            : b.bookingType === "home"
              ? "You're booked. The provider comes to your address."
              : "You're booked. See you there.",
        tone: "ok",
      };
    default:
      return null;
  }
}

const TONE_CLASS = {
  wait: "bg-amber-50 text-amber-900",
  act: "bg-blue-50 text-blue-900",
  ok: "bg-accent text-green-800",
} as const;

function priceOf(b: MyBooking): number | null {
  return b.totalCentavos ?? b.quotedPriceCentavos;
}

function UpcomingCard({
  booking: b,
  featured,
  todayKey,
}: {
  booking: MyBooking;
  featured: boolean;
  todayKey: string;
}) {
  const step = nextStep(b);
  const price = priceOf(b);
  const location = b.address ?? b.shopAddress;

  return (
    <article
      className={`group relative rounded-2xl border bg-card shadow-2xs transition-all focus-within:ring-[3px] focus-within:ring-ring/40 hover:-translate-y-0.5 hover:shadow-md ${
        featured ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        <DateTile startAt={b.startAt} />
        <div className="min-w-0 flex-1">
          {featured && (
            <p className="mb-1 text-xs font-bold tracking-wide text-green-700 uppercase">Next up</p>
          )}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h2 className="min-w-0 text-base font-semibold text-navy-900 sm:text-lg">
              <Link
                href={`/account/bookings/${b.id}`}
                className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                {b.serviceName}
              </Link>
            </h2>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-sm font-medium text-slate-600">{b.shopName}</p>

          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span className="font-medium text-navy-900">{whenLabel(b, todayKey)}</span>
            </li>
            {b.bookingType === "queue" && b.queueNumber !== null && (
              <li className="flex items-center gap-2">
                <Ticket className="size-4 shrink-0 text-slate-400" aria-hidden />
                Queue number {b.queueNumber}
              </li>
            )}
            {location && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 break-words">{location}</span>
              </li>
            )}
            {b.staffName && (
              <li className="flex items-center gap-2">
                <User className="size-4 shrink-0 text-slate-400" aria-hidden />
                With {b.staffName}
              </li>
            )}
          </ul>

          {step && (
            <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${TONE_CLASS[step.tone]}`}>
              {step.text}
            </p>
          )}
        </div>
      </div>

      <div className="flex min-h-14 items-center justify-between gap-3 border-t border-border/70 px-4 py-2 sm:px-5">
        <span className="text-sm text-slate-600">
          {price !== null ? (
            <>
              <span className="font-semibold text-navy-900">{formatPeso(price)}</span>
              {b.status === "quoted" && " quoted"}
            </>
          ) : (
            <span className="font-mono text-xs">Ref {b.refCode}</span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
          <MessageSquare className="size-4" aria-hidden />
          Details & chat
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}

function PastCard({
  booking: b,
  review,
  onRate,
  todayKey,
}: {
  booking: MyBooking;
  review: PublicReviewItem | null;
  todayKey: string;
  onRate: (booking: MyBooking, rating?: number) => void;
}) {
  const price = priceOf(b);
  const isCompleted = b.status === "completed";

  return (
    <article className="group relative rounded-2xl border border-border bg-card shadow-2xs transition-all focus-within:ring-[3px] focus-within:ring-ring/40 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex gap-4 p-4 sm:p-5">
        <DateTile
          startAt={b.startAt}
          muted
          showYear={manilaDate(b.startAt).slice(0, 4) !== todayKey.slice(0, 4)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h2 className="min-w-0 text-base font-semibold text-navy-900">
              <Link
                href={`/account/bookings/${b.id}`}
                className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                {b.serviceName}
              </Link>
            </h2>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-sm font-medium text-slate-600">{b.shopName}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
            <span>
              {/* The date tile beside this is decorative; screen readers get the date here. */}
              <span className="sr-only">{formatManila(b.startAt, "MMMM d, yyyy, ")}</span>
              {formatManila(b.startAt, "h:mm a")}
            </span>
            {price !== null && (
              <>
                <span aria-hidden>·</span>
                <span className="font-semibold text-navy-900">{formatPeso(price)}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {isCompleted && (
        <div className="relative z-10 border-t border-border/70 px-4 py-4 sm:px-5">
          {review ? <YourReview review={review} /> : <RatePrompt booking={b} onRate={onRate} />}
        </div>
      )}
    </article>
  );
}

function RatePrompt({
  booking: b,
  onRate,
}: {
  booking: MyBooking;
  onRate: (booking: MyBooking, rating?: number) => void;
}) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-navy-900">How was your visit to {b.shopName}?</p>
        <p className="text-xs text-slate-600">Tap a star to rate, then add a comment or photos.</p>
      </div>
      <div
        role="group"
        aria-label={`Rate ${b.serviceName} at ${b.shopName}`}
        className="-ml-2.5 flex sm:ml-0"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onRate(b, n)}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            className="flex size-11 items-center justify-center rounded-lg transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95"
          >
            <Star
              className={`size-7 transition-colors ${
                n <= hover ? "fill-yellow-400 text-yellow-500" : "fill-transparent text-slate-300"
              }`}
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function YourReview({ review }: { review: PublicReviewItem }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars value={review.rating} size="sm" />
        <span className="text-xs font-semibold text-slate-600">
          You rated this · {formatManila(review.createdAt, "MMM d")}
        </span>
      </div>

      {review.comment && (
        <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">
          {review.comment}
        </p>
      )}

      {review.photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {review.photos.map((p, i) => (
            <li
              key={p.id}
              className="size-16 overflow-hidden rounded-lg border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Photo ${i + 1} from your review`}
                loading="lazy"
                className="size-full object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {review.reply && (
        <div className="rounded-xl border-l-4 border-primary bg-accent/60 px-3 py-2.5 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-bold text-green-800">
            <MessageSquare className="size-3.5" aria-hidden />
            Reply from the shop
          </p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{review.reply}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Clock;
  title: string;
  body: string;
  action: { href: string; label: string } | null;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-green-700">
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-navy-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{body}</p>
      {action && (
        <Button asChild className="mt-6 active:scale-[0.98]">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
