"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/features/reviews/components/review-card";
import { ShopReplyDialog } from "@/features/reviews/components/shop-reply-dialog";
import type { DashboardReviewItem, ShopReviewStats } from "@/features/reviews/queries";

type DashboardReviewsClientProps = {
  shopId: string;
  initialReviews: DashboardReviewItem[];
  totalReviews?: number;
  unrepliedCount?: number;
  stats?: ShopReviewStats;
};

export function DashboardReviewsClient({ shopId, initialReviews }: DashboardReviewsClientProps) {
  const [reviewsList, setReviewsList] = React.useState<DashboardReviewItem[]>(initialReviews);
  const [filter, setFilter] = React.useState<"all" | "unreplied" | "replied">("all");
  const [starFilter, setStarFilter] = React.useState<number | null>(null);
  const [activeReplyReview, setActiveReplyReview] = React.useState<DashboardReviewItem | null>(
    null,
  );

  const filteredReviews = React.useMemo(() => {
    let list = [...reviewsList];

    if (filter === "unreplied") {
      list = list.filter((r) => !r.hasReply);
    } else if (filter === "replied") {
      list = list.filter((r) => r.hasReply);
    }

    if (starFilter !== null) {
      list = list.filter((r) => r.rating === starFilter);
    }

    return list;
  }, [reviewsList, filter, starFilter]);

  const currentUnrepliedCount = reviewsList.filter((r) => !r.hasReply).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-navy-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
            }`}
          >
            All Reviews ({reviewsList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unreplied")}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              filter === "unreplied"
                ? "text-navy-950 bg-amber-500 font-bold"
                : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
            }`}
          >
            <span>Needs Reply</span>
            {currentUnrepliedCount > 0 && (
              <span className="py-0.2 rounded-full bg-amber-200 px-1.5 text-[10px] font-extrabold text-navy-900">
                {currentUnrepliedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter("replied")}
            className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              filter === "replied"
                ? "bg-navy-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
            }`}
          >
            Replied ({reviewsList.filter((r) => r.hasReply).length})
          </button>
        </div>

        {/* Star Rating Quick Filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400">Stars:</span>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStarFilter(starFilter === s ? null : s)}
              className={`flex size-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                starFilter === s
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-border text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s}★
            </button>
          ))}
          {starFilter !== null && (
            <button
              type="button"
              onClick={() => setStarFilter(null)}
              className="min-h-[44px] px-2 text-xs text-danger hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`relative overflow-hidden rounded-xl border bg-card transition-shadow ${
                !rev.hasReply ? "border-amber-200 shadow-xs" : "border-border"
              }`}
            >
              {/* Unreplied Banner */}
              {!rev.hasReply && (
                <div className="flex items-center justify-between bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-800">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="size-3.5" />
                    Awaiting shop reply
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveReplyReview(rev)}
                    className="font-bold text-amber-900 underline hover:text-navy-900"
                  >
                    Reply now
                  </button>
                </div>
              )}

              {/* Reported alert banner */}
              {rev.reportsCount > 0 && (
                <div className="flex items-center gap-1.5 bg-red-50 px-4 py-1.5 text-xs font-medium text-danger">
                  <AlertTriangle className="size-3.5" />
                  <span>Reported by customers ({rev.reportsCount} open report)</span>
                </div>
              )}

              <div className="p-4 sm:p-5">
                <ReviewCard
                  review={rev}
                  shopId={shopId}
                  canReply={true}
                  onReplyUpdated={(newReply) => {
                    setReviewsList((prev) =>
                      prev.map((item) =>
                        item.id === rev.id ? { ...item, reply: newReply, hasReply: true } : item,
                      ),
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <MessageSquare className="size-6" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-navy-900">
            No reviews match this filter
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {filter === "unreplied"
              ? "Great job! You have replied to all customer reviews."
              : "Try switching to another tab or clearing the star filter."}
          </p>
          {(filter !== "all" || starFilter !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilter("all");
                setStarFilter(null);
              }}
              className="mt-4 min-h-[44px] text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* Reply dialog */}
      {activeReplyReview && (
        <ShopReplyDialog
          reviewId={activeReplyReview.id}
          shopId={shopId}
          customerName={activeReplyReview.customerName}
          customerRating={activeReplyReview.rating}
          customerComment={activeReplyReview.comment}
          existingReply={activeReplyReview.reply}
          isOpen={true}
          onClose={() => setActiveReplyReview(null)}
          onSuccess={(newReply) => {
            setReviewsList((prev) =>
              prev.map((item) =>
                item.id === activeReplyReview.id
                  ? { ...item, reply: newReply, hasReply: true }
                  : item,
              ),
            );
            setActiveReplyReview(null);
          }}
        />
      )}
    </div>
  );
}
