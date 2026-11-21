import Link from "next/link";
import { cn } from "cn";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Lock,
  MessageSquare,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import type { BookingStatus } from "@/lib/db/schema/enums";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";

import { BOOKING_TYPE_LABELS } from "../../constants";
import type { AdminBookingDetail, getAdminBookingMessages } from "../../queries";
import { focusRing } from "../directory";

type ChatMessage = Awaited<ReturnType<typeof getAdminBookingMessages>>[number];

const card = "rounded-xl border border-neutral-200 bg-white";
const fullDate = (instant: Date) => formatManila(instant, "EEE, MMM d, yyyy · h:mm a");

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: typeof MessageSquare;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(card, "p-5", className)} aria-label={title}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        {Icon && <Icon aria-hidden className="size-4 text-neutral-500" />}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

function PersonCard({
  title,
  icon: Icon,
  name,
  lines,
  links,
}: {
  title: string;
  icon: typeof Store;
  name: string;
  lines: Array<string | null>;
  links: Array<{ href: string; label: string; external?: boolean }>;
}) {
  return (
    <section className={cn(card, "p-5")} aria-label={title}>
      <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-500">
        <Icon aria-hidden className="size-4" />
        {title}
      </h2>
      <p className="mt-2 font-semibold text-navy-900">{name}</p>
      {lines
        .filter((line): line is string => Boolean(line))
        .map((line) => (
          <p key={line} className="truncate text-sm text-neutral-600">
            {line}
          </p>
        ))}
      <div className="mt-3 flex flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 self-start rounded-md text-sm font-medium text-green-700 hover:underline",
              focusRing,
            )}
          >
            {link.label}
            {link.external && (
              <>
                <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Chat({
  messages,
  messageCount,
}: {
  messages: ChatMessage[] | null;
  messageCount: number;
}) {
  if (messages === null) {
    return (
      <p className="flex items-start gap-2 text-sm text-neutral-600">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-neutral-400" />
        {messageCount > 0
          ? `The customer and shop exchanged ${messageCount} ${messageCount === 1 ? "message" : "messages"}. Chats stay private unless the booking has an open dispute.`
          : "No messages. Chats stay private unless the booking has an open dispute."}
      </p>
    );
  }
  if (messages.length === 0) {
    return <p className="text-sm text-neutral-600">No messages on this booking.</p>;
  }
  return (
    <ol className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
      {messages.map((message) => (
        <li key={message.id} className="rounded-lg bg-neutral-50 px-3 py-2.5">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-neutral-500">
            <span className="font-semibold text-navy-900">{message.senderName || "Someone"}</span>
            <time dateTime={message.createdAt.toISOString()}>{fullDate(message.createdAt)}</time>
          </p>
          {message.body && <p className="mt-1 text-sm text-neutral-800">{message.body}</p>}
          {message.imagePath && <p className="mt-1 text-xs text-neutral-500">Sent a photo</p>}
        </li>
      ))}
    </ol>
  );
}

export function AdminBookingDetailView({
  booking,
  messages,
}: {
  booking: AdminBookingDetail;
  /** Null when the viewer may not read the chat (no open dispute). */
  messages: ChatMessage[] | null;
}) {
  const centavos = booking.totalCentavos ?? booking.quotedPriceCentavos;
  const waiting = booking.status === "requested" || booking.status === "quoted";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/bookings"
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-navy-900",
          focusRing,
        )}
      >
        <ArrowLeft aria-hidden className="size-4" />
        Bookings
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-navy-900">
            Booking <span className="font-mono">{booking.refCode}</span>
          </h1>
          <BookingStatusBadge status={booking.status} />
          {booking.hasOpenDispute && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">
              <AlertTriangle aria-hidden className="size-3" />
              Open dispute
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">
          Made {fullDate(booking.createdAt)} ·{" "}
          {BOOKING_TYPE_LABELS[booking.bookingType] ?? "Booking"}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <ShieldCheck aria-hidden className="size-3.5" />
          Your view of this booking is recorded in the audit log.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Details">
            <dl className="divide-y divide-neutral-100">
              <Row label="Service">
                {booking.serviceName} · {booking.serviceDurationMin} min
              </Row>
              <Row label="When">{fullDate(booking.startAt)}</Row>
              <Row label="Price">
                {centavos === null ? (
                  "Waiting for the shop's quote"
                ) : (
                  <>
                    <span className="font-semibold tabular-nums">{formatPeso(centavos)}</span>
                    {booking.totalCentavos === null && (
                      <span className="text-neutral-500"> (quoted)</span>
                    )}
                  </>
                )}
              </Row>
              <Row label="Where">{booking.address || "At the shop"}</Row>
              {booking.notes && <Row label="Customer's note">{booking.notes}</Row>}
              {waiting && booking.expiresAt && (
                <Row label="Expires">
                  {fullDate(booking.expiresAt)}, if no one answers before then
                </Row>
              )}
            </dl>
          </Section>

          <Section title="Status history">
            {booking.events.length === 0 ? (
              <p className="text-sm text-neutral-600">No status changes recorded.</p>
            ) : (
              <ol className="relative space-y-5 border-l-2 border-neutral-200 pl-5">
                {booking.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-white bg-green-600"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <BookingStatusBadge status={event.toStatus as BookingStatus} />
                      <time
                        dateTime={event.createdAt.toISOString()}
                        className="text-xs text-neutral-500"
                      >
                        {fullDate(event.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {event.actorName ? `By ${event.actorName}` : "By BooKanto"}
                    </p>
                    {event.reason && (
                      <p className="mt-1.5 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                        {event.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {booking.disputes.length > 0 && (
            <Section title="Reports" icon={AlertTriangle}>
              <ul className="space-y-3">
                {booking.disputes.map((report) => (
                  <li key={report.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-neutral-500">
                        From {report.reporterName || "a user"} · {fullDate(report.createdAt)}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                          report.status === "open"
                            ? "bg-red-50 text-red-800"
                            : "bg-neutral-100 text-neutral-700",
                        )}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-900">{report.reason}</p>
                    {report.resolution && (
                      <p className="mt-2 border-t border-neutral-100 pt-2 text-sm text-neutral-700">
                        <span className="font-medium">Resolution:</span> {report.resolution}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <Link
                href="/admin/disputes?status=open&target=booking"
                className={cn(
                  "mt-2 inline-flex min-h-11 items-center text-sm font-medium text-green-700 hover:underline",
                  focusRing,
                )}
              >
                Go to disputes
              </Link>
            </Section>
          )}

          <Section title="Chat" icon={MessageSquare}>
            <Chat messages={messages} messageCount={booking.messageCount} />
          </Section>
        </div>

        <div className="space-y-4">
          <PersonCard
            title="Customer"
            icon={UserRound}
            name={booking.customerName || "No name"}
            lines={[booking.customerEmail, booking.customerPhone]}
            links={[{ href: `/admin/users/${booking.customerId}`, label: "Open customer" }]}
          />
          <PersonCard
            title="Shop"
            icon={Store}
            name={booking.shopName}
            lines={[booking.shopPhone]}
            links={[
              { href: `/admin/shops/${booking.shopId}`, label: "Open shop" },
              { href: `/shop/${booking.shopSlug}`, label: "Public page", external: true },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export function AdminBookingDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the booking">
      <Skeleton className="h-5 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
