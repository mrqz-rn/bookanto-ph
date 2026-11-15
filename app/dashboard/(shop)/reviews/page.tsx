import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, ExternalLink, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getShopDashboardReviews, getShopReviewStats } from "@/features/reviews/queries";
import { getUserShops } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";

import { DashboardReviewsClient } from "@/features/reviews/components/dashboard-reviews-client";

export const metadata: Metadata = {
  title: "Customer Reviews | Shop Dashboard",
  description: "View customer feedback, ratings, and reply to reviews on your shop.",
};

export default async function DashboardReviewsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard/reviews");
  }

  const shops = await getUserShops();
  const currentShop = shops[0] || null;

  if (!currentShop) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-12 text-center">
        <Star className="size-12 text-slate-300" />
        <h2 className="mt-4 font-display text-xl font-bold text-navy-900">No Shop Found</h2>
        <p className="mt-1 text-sm text-slate-500">
          You need an active shop account to manage reviews and customer replies.
        </p>
        <Button asChild className="mt-6 bg-green-600 text-white hover:bg-green-700">
          <Link href="/dashboard/setup">Set Up Shop</Link>
        </Button>
      </div>
    );
  }

  const [stats, reviewsData] = await Promise.all([
    getShopReviewStats(currentShop.id),
    getShopDashboardReviews(currentShop.id, { limit: 50 }),
  ]);

  const responseRate =
    stats.ratingCount > 0
      ? Math.round(((stats.ratingCount - reviewsData.unrepliedCount) / stats.ratingCount) * 100)
      : 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
            <Sparkles className="size-3.5" />
            Shop Reputation
          </span>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            Customer Reviews & Replies
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Monitor satisfaction, praise your team, and build trust by responding to customer
            feedback.
          </p>
        </div>

        {currentShop.slug && (
          <Button asChild variant="outline" size="sm" className="min-h-[44px] text-xs">
            <Link href={`/shop/${currentShop.slug}`} target="_blank">
              View Public Page <ExternalLink className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Rating average */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Average Rating</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-navy-900">
              {stats.ratingAvg > 0 ? stats.ratingAvg.toFixed(1) : "New"}
            </span>
            <Star className="size-5 fill-amber-400 text-amber-500" />
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            From {stats.ratingCount} {stats.ratingCount === 1 ? "review" : "reviews"}
          </span>
        </div>

        {/* Total Reviews */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total Reviews</span>
          <div className="mt-2 font-display text-3xl font-bold text-navy-900">
            {stats.ratingCount}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">{stats.photosCount} with photos</span>
        </div>

        {/* Unreplied */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Awaiting Reply</span>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`font-display text-3xl font-bold ${
                reviewsData.unrepliedCount > 0 ? "text-amber-600" : "text-success"
              }`}
            >
              {reviewsData.unrepliedCount}
            </span>
            {reviewsData.unrepliedCount > 0 ? (
              <AlertCircle className="size-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="size-5 text-success" />
            )}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            {reviewsData.unrepliedCount > 0 ? "Needs your attention" : "All caught up!"}
          </span>
        </div>

        {/* Response Rate */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Response Rate</span>
          <div className="mt-2 flex items-baseline gap-2 font-display text-3xl font-bold text-navy-900">
            {responseRate}%
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            {stats.recommendPercentage}% positive rating
          </span>
        </div>
      </div>

      {/* Interactive Reviews Manager (Client Component) */}
      <DashboardReviewsClient
        shopId={currentShop.id}
        initialReviews={reviewsData.items}
        totalReviews={reviewsData.total}
        unrepliedCount={reviewsData.unrepliedCount}
        stats={stats}
      />
    </div>
  );
}
