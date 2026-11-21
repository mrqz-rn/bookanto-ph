import { Suspense } from "react";
import type { Metadata } from "next";

import {
  BookingResults,
  BookingResultsSkeleton,
  BookingSearch,
  BookingViewTabs,
  type BookingDirectoryFilters,
} from "@/features/admin/components/bookings/booking-directory";
import { FilterBar } from "@/features/admin/components/directory";
import {
  ADMIN_BOOKING_VIEWS,
  DEFAULT_PAGE_SIZE,
  type AdminBookingView,
} from "@/features/admin/constants";
import { getAdminBookings, getAdminBookingViewCounts } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Bookings | BooKanto Admin",
};

type AdminBookingsPageProps = {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
};

function readFilters(
  params: Awaited<AdminBookingsPageProps["searchParams"]>,
): BookingDirectoryFilters {
  const view = (ADMIN_BOOKING_VIEWS as readonly string[]).includes(params.view ?? "")
    ? (params.view as AdminBookingView)
    : "all";
  const page = Number.parseInt(params.page ?? "1", 10);
  return {
    view,
    q: (params.q ?? "").trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

async function Results({ filters }: { filters: BookingDirectoryFilters }) {
  const { bookings, total } = await getAdminBookings({
    view: filters.view,
    search: filters.q || undefined,
    limit: DEFAULT_PAGE_SIZE,
    offset: (filters.page - 1) * DEFAULT_PAGE_SIZE,
  });
  return (
    <BookingResults
      bookings={bookings}
      total={total}
      pageSize={DEFAULT_PAGE_SIZE}
      filters={filters}
    />
  );
}

export default async function AdminBookingsPage({ searchParams }: AdminBookingsPageProps) {
  const filters = readFilters(await searchParams);
  const counts = await getAdminBookingViewCounts();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-navy-900">Bookings</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Every booking across all shops. Opening one is recorded in the audit log.
        </p>
      </header>

      <FilterBar>
        <BookingViewTabs counts={counts} filters={filters} />
        <BookingSearch filters={filters} />
      </FilterBar>

      {/* A new key per filter, so switching tabs or pages shows the skeleton. */}
      <Suspense
        key={`${filters.view}|${filters.q}|${filters.page}`}
        fallback={<BookingResultsSkeleton />}
      >
        <Results filters={filters} />
      </Suspense>
    </div>
  );
}
