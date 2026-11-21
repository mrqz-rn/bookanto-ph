import Link from "next/link";
import { cn } from "cn";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { formatPeso } from "@/lib/money";
import { formatManila, formatTimeAgo } from "@/lib/time";

import {
  ADMIN_BOOKING_VIEW_LABELS,
  ADMIN_BOOKING_VIEWS,
  BOOKING_TYPE_LABELS,
  type AdminBookingView,
} from "../../constants";
import type { AdminBookingListItem } from "../../queries";
import {
  DirectorySearch,
  EmptyState,
  FilterTabs,
  focusRing,
  Pagination,
  ResultsSummary,
} from "../directory";

export type BookingDirectoryFilters = {
  view: AdminBookingView;
  q: string;
  page: number;
};

export function bookingsHref({ view, q, page }: Partial<BookingDirectoryFilters>): string {
  const params = new URLSearchParams();
  if (view && view !== "all") params.set("view", view);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

/** Tab order: what needs watching first. */
const TAB_ORDER: AdminBookingView[] = [
  "waiting",
  "disputed",
  "confirmed",
  "completed",
  "closed",
  "all",
];

export function BookingViewTabs({
  counts,
  filters,
}: {
  counts: Record<AdminBookingView, number>;
  filters: BookingDirectoryFilters;
}) {
  return (
    <FilterTabs
      label="Booking status"
      tabs={TAB_ORDER.filter((view) => ADMIN_BOOKING_VIEWS.includes(view)).map((view) => ({
        href: bookingsHref({ view, q: filters.q }),
        label: ADMIN_BOOKING_VIEW_LABELS[view],
        count: counts[view],
        active: filters.view === view,
        attention: view === "disputed",
      }))}
    />
  );
}

export function BookingSearch({ filters }: { filters: BookingDirectoryFilters }) {
  return (
    <DirectorySearch
      action="/admin/bookings"
      id="booking-search"
      label="Search bookings"
      placeholder="Reference, customer, email or shop"
      defaultValue={filters.q}
      keep={{ view: filters.view === "all" ? undefined : filters.view }}
    />
  );
}

// ---------------------------------------------------------------------------
// Results

const price = (booking: AdminBookingListItem) => {
  const centavos = booking.totalCentavos ?? booking.quotedPriceCentavos;
  return centavos === null ? "Quote" : formatPeso(centavos);
};

const when = (booking: AdminBookingListItem) => formatManila(booking.startAt, "MMM d · h:mm a");

function DisputedMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
      <AlertTriangle aria-hidden className="size-3" />
      Disputed
    </span>
  );
}

function BookingTable({ bookings }: { bookings: AdminBookingListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white xl:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Booking
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Shop and service
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Customer
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              For
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Price
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {bookings.map((booking) => (
            <tr key={booking.id} className="transition-colors duration-150 hover:bg-neutral-50">
              <td className="px-4 py-3 whitespace-nowrap">
                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className={cn(
                    "rounded font-mono text-sm font-semibold text-navy-900 hover:text-green-700",
                    focusRing,
                  )}
                >
                  {booking.refCode}
                </Link>
                <p className="text-xs text-neutral-500">made {formatTimeAgo(booking.createdAt)}</p>
              </td>
              <td className="max-w-64 px-4 py-3">
                <p className="truncate text-neutral-900">{booking.shopName}</p>
                <p className="truncate text-xs text-neutral-500">
                  {booking.serviceName} · {BOOKING_TYPE_LABELS[booking.bookingType] ?? "Booking"}
                </p>
              </td>
              <td className="max-w-52 px-4 py-3">
                <p className="truncate text-neutral-900">{booking.customerName || "No name"}</p>
                <p className="truncate text-xs text-neutral-500">{booking.customerEmail ?? ""}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-neutral-700">{when(booking)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap text-neutral-900 tabular-nums">
                {price(booking)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <BookingStatusBadge status={booking.status} />
                  {booking.hasOpenDispute && <DisputedMark />}
                </div>
              </td>
              <td className="px-4 py-2 text-right">
                <Button asChild variant="outline" className="motion-safe:active:scale-[0.98]">
                  <Link href={`/admin/bookings/${booking.id}`}>
                    Open<span className="sr-only"> booking {booking.refCode}</span>
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingCards({ bookings }: { bookings: AdminBookingListItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link
            href={`/admin/bookings/${booking.id}`}
            className={cn(
              "block h-full rounded-xl border border-neutral-200 bg-white p-4 transition-[transform,box-shadow] duration-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
              focusRing,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-navy-900">{booking.refCode}</p>
                <p className="text-xs text-neutral-500">made {formatTimeAgo(booking.createdAt)}</p>
              </div>
              <p className="text-right font-semibold text-navy-900 tabular-nums">
                {price(booking)}
              </p>
            </div>
            <p className="mt-3 truncate text-sm text-neutral-900">{booking.shopName}</p>
            <p className="truncate text-xs text-neutral-500">
              {booking.serviceName} · {BOOKING_TYPE_LABELS[booking.bookingType] ?? "Booking"}
            </p>
            <p className="mt-2 truncate text-sm text-neutral-700">
              {booking.customerName || "No name"}
              <span className="text-neutral-500"> · for {when(booking)}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <BookingStatusBadge status={booking.status} />
              {booking.hasOpenDispute && <DisputedMark />}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyResults({ filters }: { filters: BookingDirectoryFilters }) {
  let title = "No bookings yet";
  let body = "Bookings from every shop appear here as customers make them.";
  if (filters.q) {
    title = `No bookings match “${filters.q}”`;
    body = "Search by reference, customer name or email, or shop name.";
  } else if (filters.page > 1) {
    title = "This page is empty";
    body = "The list is shorter than it was. Go back to the first page.";
  } else if (filters.view === "disputed") {
    title = "No open disputes";
    body = "Bookings with an open report from a customer or shop show up here.";
  } else if (filters.view === "waiting") {
    title = "Nothing waiting for a reply";
    body = "Every request and quote has an answer.";
  } else if (filters.view !== "all") {
    title = `No ${ADMIN_BOOKING_VIEW_LABELS[filters.view].toLowerCase()} bookings`;
    body = "Try another tab.";
  }
  const reset =
    filters.q || filters.page > 1
      ? {
          href: bookingsHref({ view: filters.view }),
          label: filters.q ? "Clear search" : "First page",
        }
      : undefined;
  return <EmptyState title={title} body={body} reset={reset} />;
}

export function BookingResults({
  bookings,
  total,
  pageSize,
  filters,
}: {
  bookings: AdminBookingListItem[];
  total: number;
  pageSize: number;
  filters: BookingDirectoryFilters;
}) {
  if (bookings.length === 0) return <EmptyResults filters={filters} />;
  return (
    <div className="space-y-4">
      <ResultsSummary
        first={(filters.page - 1) * pageSize + 1}
        count={bookings.length}
        total={total}
        noun={["booking", "bookings"]}
        query={filters.q}
        note="newest first"
      />
      <BookingTable bookings={bookings} />
      <BookingCards bookings={bookings} />
      <Pagination
        page={filters.page}
        total={total}
        pageSize={pageSize}
        hrefFor={(page) => bookingsHref({ ...filters, page })}
      />
    </div>
  );
}

/** The results area while it loads: table rows from 1280px, cards below. */
export function BookingResultsSkeleton() {
  const rows = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading bookings">
      <Skeleton className="h-5 w-56" />
      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white xl:block">
        <div className="h-10 border-b border-neutral-200 bg-neutral-50" />
        <div className="divide-y divide-neutral-100">
          {rows.map((i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="w-28 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="w-56 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="w-44 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="ml-auto h-11 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {rows.slice(0, 4).map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-4 h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-36" />
            <Skeleton className="mt-3 h-4 w-56" />
            <Skeleton className="mt-3 h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
