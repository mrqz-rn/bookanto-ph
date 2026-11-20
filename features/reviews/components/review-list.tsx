"use client";

import * as React from "react";
import { ArrowUpDown, PenLine, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

import { REVIEW_SORT_OPTIONS, type ReviewSortOption } from "../constants";
import { ReviewCard, type ReviewCardData } from "./review-card";
import { ReviewFormDialog } from "./review-form-dialog";
import {
  ReviewHighlights,
  type HighlightItem,
  type ReviewDistributionData,
  type ReviewPhotoThumb,
} from "./review-highlights";

type ReviewListProps = {
  shopId: string;
  shopName: string;
  ratingAvg: number;
  ratingCount: number;
  recommendPercentage: number;
  distribution: ReviewDistributionData;
  highlights: HighlightItem[];
  photosCount: number;
  showcasePhotos: ReviewPhotoThumb[];
  initialReviews: ReviewCardData[];
  canReview?: boolean;
  eligibleBookingId?: string | null;
  eligibleServiceName?: string | null;
  canReply?: boolean;
};

export function ReviewList({
  shopId,
  shopName,
  ratingAvg,
  ratingCount,
  recommendPercentage,
  distribution,
  highlights,
  photosCount,
  showcasePhotos,
  initialReviews,
  canReview = false,
  eligibleBookingId = null,
  eligibleServiceName = null,
  canReply = false,
}: ReviewListProps) {
  const [reviewsList, setReviewsList] = React.useState<ReviewCardData[]>(initialReviews);
  const [selectedRating, setSelectedRating] = React.useState<number | null>(null);
  const [selectedHighlight, setSelectedHighlight] = React.useState<string | null>(null);
  const [onlyWithPhotos, setOnlyWithPhotos] = React.useState(false);
  const [sortOption, setSortOption] = React.useState<ReviewSortOption>("recent");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(10);

  // Filter and sort reviews locally for immediate responsiveness
  const filteredReviews = React.useMemo(() => {
    let list = [...reviewsList];

    // Filter by rating
    if (selectedRating !== null) {
      list = list.filter((r) => r.rating === selectedRating);
    }

    // Filter by photos
    if (onlyWithPhotos) {
      list = list.filter((r) => r.photos && r.photos.length > 0);
    }

    // Filter by highlight keywords
    if (selectedHighlight) {
      const highlightDef = highlights.find((h) => h.id === selectedHighlight);
      if (highlightDef) {
        list = list.filter((r) => {
          if (!r.comment) return false;
          const lower = r.comment.toLowerCase();
          // Match highlight label or keywords
          return (
            lower.includes(highlightDef.label.toLowerCase()) ||
            lower.includes(selectedHighlight.toLowerCase())
          );
        });
      }
    }

    // Sort
    list.sort((a, b) => {
      if (sortOption === "highest") {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === "lowest") {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === "with_photos") {
        const aHas = a.photos && a.photos.length > 0 ? 1 : 0;
        const bHas = b.photos && b.photos.length > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // default: recent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [reviewsList, selectedRating, onlyWithPhotos, selectedHighlight, sortOption, highlights]);

  const displayedReviews = filteredReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReviews.length;

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="reviews-heading"
            className="font-display text-2xl font-bold text-navy-900 sm:text-3xl"
          >
            Customer Reviews
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            Genuine ratings and feedback from verified BooKanto clients.
          </p>
        </div>

        {canReview && eligibleBookingId && (
          <Button
            type="button"
            onClick={() => setIsReviewDialogOpen(true)}
            className="min-h-[44px] bg-green-600 font-semibold text-white hover:bg-green-700"
          >
            <PenLine className="mr-2 size-4" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Highlights & Aggregates Banner */}
      <ReviewHighlights
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        recommendPercentage={recommendPercentage}
        distribution={distribution}
        highlights={highlights}
        photosCount={photosCount}
        showcasePhotos={showcasePhotos}
        selectedRating={selectedRating}
        onSelectRating={setSelectedRating}
        selectedHighlight={selectedHighlight}
        onSelectHighlight={setSelectedHighlight}
        onlyWithPhotos={onlyWithPhotos}
        onToggleWithPhotos={setOnlyWithPhotos}
      />

      {/* Sort and active count bar */}
      {reviewsList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="text-xs font-semibold text-slate-600">
            Showing {filteredReviews.length} of {reviewsList.length} reviews
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="reviews-sort"
              className="flex items-center gap-1 text-xs text-slate-500"
            >
              <ArrowUpDown className="size-3.5" />
              <span>Sort by:</span>
            </label>
            <select
              id="reviews-sort"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as ReviewSortOption)}
              className="min-h-[44px] rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-navy-900 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {REVIEW_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Review Cards List */}
      {displayedReviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          {displayedReviews.map((rev) => (
            <ReviewCard
              key={rev.id}
              review={rev}
              shopId={shopId}
              canReply={canReply}
              onReplyUpdated={(newReply) => {
                setReviewsList((prev) =>
                  prev.map((item) => (item.id === rev.id ? { ...item, reply: newReply } : item)),
                );
              }}
            />
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="min-h-[44px] px-6 text-xs font-semibold"
              >
                Load More Reviews ({filteredReviews.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      ) : reviewsList.length > 0 ? (
        // Only when filters hide every review; with no reviews at all, the
        // highlights block above already shows the "No reviews yet" state.
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/50 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <Star className="size-5 text-slate-500" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-navy-900">
            No reviews match your selected filter
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Try choosing a different star rating or clearing the active highlight filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRating(null);
              setSelectedHighlight(null);
              setOnlyWithPhotos(false);
            }}
            className="mt-4 min-h-[44px] text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : null}

      {/* Review Dialog */}
      {canReview && eligibleBookingId && (
        <ReviewFormDialog
          bookingId={eligibleBookingId}
          shopName={shopName}
          serviceName={eligibleServiceName}
          isOpen={isReviewDialogOpen}
          onClose={() => setIsReviewDialogOpen(false)}
          onSuccess={() => {
            setIsReviewDialogOpen(false);
            // Reload page or revalidate
            window.location.reload();
          }}
        />
      )}
    </section>
  );
}
