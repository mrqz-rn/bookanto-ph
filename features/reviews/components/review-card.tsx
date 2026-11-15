"use client";

import * as React from "react";
import { BadgeCheck, Flag, MessageSquare, Reply, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { RatingStars } from "./rating-stars";
import { ReportReviewDialog } from "./report-review-dialog";
import { ShopReplyDialog } from "./shop-reply-dialog";

export type ReviewPhotoData = {
  id: string;
  path: string;
  url: string;
  sortOrder: number;
};

export type ReviewCardData = {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  serviceName: string | null;
  photos: ReviewPhotoData[];
  createdAt: string;
  updatedAt: string;
};

type ReviewCardProps = {
  review: ReviewCardData;
  shopId: string;
  canReply?: boolean;
  onReplyUpdated?: (newReply: string) => void;
};

export function ReviewCard({ review, shopId, canReply = false, onReplyUpdated }: ReviewCardProps) {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = React.useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [isReplyOpen, setIsReplyOpen] = React.useState(false);
  const [currentReply, setCurrentReply] = React.useState<string | null>(review.reply);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(review.createdAt);
      return d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [review.createdAt]);

  const initials = review.customerName
    ? review.customerName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "CU";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-5">
      {/* Header: User, rating, verified badge, date */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-green-700">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-navy-900">{review.customerName}</span>
              <span
                title="Verified BooKanto appointment"
                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-success"
              >
                <BadgeCheck className="size-3" />
                Verified
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RatingStars value={review.rating} size="sm" />
              <span>•</span>
              <time dateTime={review.createdAt}>{formattedDate}</time>
            </div>
          </div>
        </div>

        {/* Action dropdown or report button */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReportOpen(true)}
            title="Report this review"
            aria-label="Report this review"
            className="h-8 min-h-[44px] min-w-[44px] px-2 text-xs text-slate-400 hover:text-danger"
          >
            <Flag className="size-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Report</span>
          </Button>

          {canReply && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReplyOpen(true)}
              className="h-8 min-h-[44px] text-xs font-medium"
            >
              <Reply className="mr-1 size-3.5" />
              {currentReply ? "Edit Reply" : "Reply"}
            </Button>
          )}
        </div>
      </div>

      {/* Service tag */}
      {review.serviceName && (
        <div className="text-xs font-medium text-slate-600">
          Service: <span className="font-semibold text-navy-900">{review.serviceName}</span>
        </div>
      )}

      {/* Review comment */}
      {review.comment && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
          {review.comment}
        </p>
      )}

      {/* Photo thumbnails */}
      {review.photos && review.photos.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {review.photos.map((photo, i) => (
            <button
              key={photo.id || i}
              type="button"
              onClick={() => setSelectedPhotoUrl(photo.url)}
              aria-label={`View photo ${i + 1} full size`}
              className="group relative size-16 min-h-[44px] min-w-[44px] overflow-hidden rounded-lg border border-border bg-slate-100 shadow-2xs transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`Customer review photo ${i + 1}`}
                className="size-full object-cover transition-opacity group-hover:opacity-90"
              />
            </button>
          ))}
        </div>
      )}

      {/* Shop Official Response */}
      {currentReply && (
        <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <MessageSquare className="size-3.5" />
            <span>Response from the owner</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-line text-slate-700">
            {currentReply}
          </p>
        </div>
      )}

      {/* Lightbox photo modal */}
      {selectedPhotoUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhotoUrl}
              alt="Enlarged review photo"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedPhotoUrl(null)}
              aria-label="Close enlarged photo"
              className="absolute top-3 right-3 flex size-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* Report dialog */}
      <ReportReviewDialog
        reviewId={review.id}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Shop reply dialog */}
      {canReply && (
        <ShopReplyDialog
          reviewId={review.id}
          shopId={shopId}
          customerName={review.customerName}
          customerRating={review.rating}
          customerComment={review.comment}
          existingReply={currentReply}
          isOpen={isReplyOpen}
          onClose={() => setIsReplyOpen(false)}
          onSuccess={(newReply) => {
            setCurrentReply(newReply);
            setIsReplyOpen(false);
            if (onReplyUpdated) onReplyUpdated(newReply);
          }}
        />
      )}
    </article>
  );
}
