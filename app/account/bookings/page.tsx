import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMyBookings } from "@/features/bookings/customer-queries";
import { getReviewsForBookings } from "@/features/reviews/queries";
import { getCurrentUser } from "@/lib/auth";
import { manilaDate } from "@/lib/time";

import { CustomerBookingsClient, type BookingsTab } from "./bookings-client";

export const metadata: Metadata = {
  title: "My Bookings & Reviews | BooKanto",
  description: "Track your upcoming appointments, completed services, and submit shop reviews.",
};

type PageProps = {
  searchParams: Promise<{ tab?: string; before?: string }>;
};

const TABS: readonly BookingsTab[] = ["upcoming", "review", "past"];

export default async function CustomerBookingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account/bookings");
  }

  const { tab: tabParam, before } = await searchParams;
  const olderPage = Boolean(before);

  const [upcomingRes, pastRes] = await Promise.all([
    getMyBookings(user.id, "upcoming"),
    getMyBookings(user.id, "past", before ?? null),
  ]);

  const completedIds = pastRes.items.filter((b) => b.status === "completed").map((b) => b.id);
  const reviews = await getReviewsForBookings(completedIds);
  const toReviewCount = completedIds.filter((id) => !reviews[id]).length;

  // Open on what needs attention: the next appointment, else a visit to rate.
  const requestedTab = TABS.find((t) => t === tabParam);
  const initialTab: BookingsTab =
    requestedTab ??
    (olderPage
      ? "past"
      : upcomingRes.items.length > 0
        ? "upcoming"
        : toReviewCount > 0
          ? "review"
          : "past");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            My Bookings & Reviews
          </h1>
          <p className="mt-1 max-w-prose text-sm text-slate-600">
            Your appointments, what happened at past visits, and the shops waiting for your rating.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 active:scale-[0.98] sm:w-auto">
          <Link href="/explore">
            <Plus aria-hidden />
            Book a service
          </Link>
        </Button>
      </div>

      <CustomerBookingsClient
        upcomingBookings={upcomingRes.items}
        pastBookings={pastRes.items}
        reviews={reviews}
        initialTab={initialTab}
        todayKey={manilaDate(new Date())}
        olderHref={
          pastRes.nextCursor ? `/account/bookings?tab=past&before=${pastRes.nextCursor}` : null
        }
        newestHref={olderPage ? "/account/bookings?tab=past" : null}
      />
    </div>
  );
}
