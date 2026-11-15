import type { Metadata } from "next";

import { BookingsOversightTable } from "@/features/admin/components/bookings/bookings-oversight-table";
import { getAdminBookings } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Bookings Oversight | BooKanto Admin",
};

type AdminBookingsPageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

export default async function AdminBookingsPage({ searchParams }: AdminBookingsPageProps) {
  const { status, q } = await searchParams;

  const { bookings, total } = await getAdminBookings({
    status: status ?? "all",
    search: q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900">
          Platform Bookings Oversight
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Inspect bookings across all merchants, review lifecycle event logs, and trace disputed
          reservations.
        </p>
      </div>

      <BookingsOversightTable
        bookings={bookings}
        total={total}
        currentStatus={status ?? "all"}
        currentSearch={q ?? ""}
      />
    </div>
  );
}
