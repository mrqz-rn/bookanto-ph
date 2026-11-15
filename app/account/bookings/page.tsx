import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMyBookings } from "@/features/bookings/customer-queries";
import { getBookingReview, type PublicReviewItem } from "@/features/reviews/queries";
import { getCurrentUser } from "@/lib/auth";

import { CustomerBookingsClient } from "./bookings-client";

export const metadata: Metadata = {
  title: "My Bookings & Reviews | BooKanto",
  description: "Track your upcoming appointments, completed services, and submit shop reviews.",
};

export default async function CustomerBookingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account/bookings");
  }

  const [upcomingRes, pastRes] = await Promise.all([
    getMyBookings(user.id, "upcoming"),
    getMyBookings(user.id, "past"),
  ]);

  // For completed past bookings, fetch any existing reviews
  const reviewsByBookingId: Record<string, PublicReviewItem | null> = {};
  const completedBookings = pastRes.items.filter((b) => b.status === "completed");

  await Promise.all(
    completedBookings.map(async (b) => {
      const review = await getBookingReview(b.id);
      if (review) {
        reviewsByBookingId[b.id] = review;
      }
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          My Bookings & Reviews
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          View your upcoming appointments, check booking history, and rate your completed services.
        </p>
      </div>

      <CustomerBookingsClient
        upcomingBookings={upcomingRes.items}
        pastBookings={pastRes.items}
        initialReviews={reviewsByBookingId}
      />
    </div>
  );
}
