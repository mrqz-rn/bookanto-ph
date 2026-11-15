"use client";

import * as React from "react";
import { Camera, Check, Sparkles, Star, ThumbsUp, X } from "lucide-react";

import { RatingStars } from "./rating-stars";

export type HighlightItem = {
  id: string;
  label: string;
  count: number;
};

export type ReviewDistributionData = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ReviewPhotoThumb = {
  id: string;
  url: string;
};

type ReviewHighlightsProps = {
  ratingAvg: number;
  ratingCount: number;
  recommendPercentage: number;
  distribution: ReviewDistributionData;
  highlights: HighlightItem[];
  photosCount: number;
  showcasePhotos: ReviewPhotoThumb[];
  selectedRating?: number | null;
  onSelectRating?: (rating: number | null) => void;
  selectedHighlight?: string | null;
  onSelectHighlight?: (highlightId: string | null) => void;
  onlyWithPhotos?: boolean;
  onToggleWithPhotos?: (withPhotos: boolean) => void;
};

export function ReviewHighlights({
  ratingAvg,
  ratingCount,
  recommendPercentage,
  distribution,
  highlights,
  photosCount,
  showcasePhotos,
  selectedRating = null,
  onSelectRating,
  selectedHighlight = null,
  onSelectHighlight,
  onlyWithPhotos = false,
  onToggleWithPhotos,
}: ReviewHighlightsProps) {
  const [selectedPhotoModalUrl, setSelectedPhotoModalUrl] = React.useState<string | null>(null);

  if (ratingCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50/60 p-6 text-center sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-green-700">
          <Star className="size-6 fill-green-600 text-green-700" />
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-navy-900">No reviews yet</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Be the first customer to book an appointment and share your review!
        </p>
      </div>
    );
  }

  const activeFiltersCount =
    (selectedRating ? 1 : 0) + (selectedHighlight ? 1 : 0) + (onlyWithPhotos ? 1 : 0);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
        {/* Left Column: Overall score & recommendation */}
        <div className="flex flex-col items-center justify-center border-b border-border pb-6 text-center md:col-span-4 md:border-r md:border-b-0 md:pr-6 md:pb-0">
          <div className="font-display text-5xl font-extrabold text-navy-900">
            {ratingAvg.toFixed(1)}
          </div>
          <div className="mt-2 flex items-center justify-center">
            <RatingStars value={Math.round(ratingAvg)} size="md" />
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Based on {ratingCount} verified {ratingCount === 1 ? "review" : "reviews"}
          </p>

          {recommendPercentage > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-success">
              <ThumbsUp className="size-3.5" />
              <span>{recommendPercentage}% recommend this shop</span>
            </div>
          )}
        </div>

        {/* Right Column: 5-Star distribution bar breakdown */}
        <div className="flex flex-col justify-center gap-2 md:col-span-8">
          <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Rating Breakdown
          </h4>

          <div className="flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
              const percentage = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
              const isSelected = selectedRating === star;

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => onSelectRating?.(isSelected ? null : star)}
                  className={`group flex min-h-[36px] items-center gap-3 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-slate-50 ${
                    isSelected ? "bg-accent/40 font-bold" : ""
                  }`}
                  title={`Filter by ${star} stars (${count} reviews)`}
                  aria-pressed={isSelected}
                >
                  <span className="flex w-10 shrink-0 items-center gap-1 font-semibold text-slate-700 group-hover:text-navy-900">
                    <span>{star}</span>
                    <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  </span>

                  {/* Bar */}
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected
                          ? "bg-green-600"
                          : star >= 4
                            ? "bg-amber-400 group-hover:bg-amber-500"
                            : "bg-slate-400 group-hover:bg-slate-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-12 shrink-0 text-right text-slate-500 group-hover:text-navy-900">
                    {count} ({percentage}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review Highlights Tags Section */}
      {highlights.length > 0 && (
        <div className="border-t border-border pt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
            <Sparkles className="size-3.5 text-green-600" />
            <span>Review Highlights</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            What customers frequently praise about this shop:
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {highlights.map((h) => {
              const isSelected = selectedHighlight === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onSelectHighlight?.(isSelected ? null : h.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-green-600 text-white shadow-xs"
                      : "border border-border bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {isSelected && <Check className="size-3.5" />}
                  <span>{h.label}</span>
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isSelected ? "bg-green-700 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {h.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Photos Showcase Preview */}
      {showcasePhotos.length > 0 && (
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Camera className="size-3.5 text-green-600" />
              <span>Customer Photos ({photosCount})</span>
            </div>
            {onToggleWithPhotos && (
              <button
                type="button"
                onClick={() => onToggleWithPhotos(!onlyWithPhotos)}
                className={`text-xs font-semibold ${
                  onlyWithPhotos ? "text-danger" : "text-green-700 hover:underline"
                }`}
              >
                {onlyWithPhotos ? "Show all reviews" : "Filter reviews with photos"}
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
            {showcasePhotos.map((photo, i) => (
              <button
                key={photo.id || i}
                type="button"
                onClick={() => setSelectedPhotoModalUrl(photo.url)}
                aria-label={`View photo ${i + 1} full size`}
                className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-slate-100 shadow-2xs transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-24"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Customer photo ${i + 1}`}
                  className="size-full object-cover transition-opacity group-hover:opacity-90"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Clear Bar */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="text-slate-500">
            Active filters ({activeFiltersCount}):
            {selectedRating && (
              <span className="ml-1 font-semibold text-navy-900">{selectedRating} Stars</span>
            )}
            {selectedHighlight && (
              <span className="ml-1 font-semibold text-navy-900">
                &quot;{highlights.find((h) => h.id === selectedHighlight)?.label}&quot;
              </span>
            )}
            {onlyWithPhotos && (
              <span className="ml-1 font-semibold text-navy-900">With Photos</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectRating?.(null);
              onSelectHighlight?.(null);
              onToggleWithPhotos?.(false);
            }}
            className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-danger hover:underline"
          >
            <X className="size-3.5" />
            Clear all filters
          </button>
        </div>
      )}

      {/* Lightbox modal for showcase */}
      {selectedPhotoModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setSelectedPhotoModalUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhotoModalUrl}
              alt="Customer photo showcase"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedPhotoModalUrl(null)}
              aria-label="Close enlarged photo"
              className="absolute top-3 right-3 flex size-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
