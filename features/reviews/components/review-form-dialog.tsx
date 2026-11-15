"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { createReview } from "../actions";
import { MAX_COMMENT_LENGTH } from "../constants";
import { RatingStars } from "./rating-stars";
import { ReviewPhotosUploader, type StagedPhoto } from "./review-photos-uploader";

type ReviewFormDialogProps = {
  bookingId: string;
  shopName: string;
  serviceName?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (reviewId: string) => void;
};

export function ReviewFormDialog({
  bookingId,
  shopName,
  serviceName,
  isOpen,
  onClose,
  onSuccess,
}: ReviewFormDialogProps) {
  const [rating, setRating] = React.useState<number>(0);
  const [comment, setComment] = React.useState("");
  const [photos, setPhotos] = React.useState<StagedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successReviewId, setSuccessReviewId] = React.useState<string | null>(null);

  // Reset when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setRating(0);
      setComment("");
      setPhotos([]);
      setErrorMessage(null);
      setSuccessReviewId(null);
    }
  }, [isOpen]);

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setErrorMessage("Please select a star rating from 1 to 5.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const photoPaths = photos.map((p) => p.path || p.previewUrl).filter(Boolean);

      const res = await createReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
        photoPaths,
      });

      if (!res.ok) {
        setErrorMessage(res.message || "Failed to submit review. Please try again.");
        return;
      }

      setSuccessReviewId(res.data.reviewId);
      if (onSuccess) {
        onSuccess(res.data.reviewId);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      className="bg-navy-950/60 fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
              <Sparkles className="size-3.5" />
              Verified Booking Review
            </span>
            <h2 id="review-dialog-title" className="font-display text-xl font-bold text-navy-900">
              Rate your experience
            </h2>
            <p className="text-xs text-slate-600">
              {shopName} {serviceName ? `• ${serviceName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="flex size-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        {successReviewId ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-navy-900">
              Salamat sa review mo!
            </h3>
            <p className="mt-1 max-w-xs text-sm text-slate-600">
              Your honest feedback helps both the shop and fellow customers in the community.
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-[44px] w-full bg-green-600 font-semibold text-white hover:bg-green-700"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger"
              >
                {errorMessage}
              </div>
            )}

            {/* Star rating selector */}
            <RatingStars
              value={rating}
              onChange={setRating}
              size="lg"
              label="Overall Rating *"
              disabled={isSubmitting}
            />

            {/* Comment */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="review-comment" className="text-xs font-semibold text-slate-700">
                  Your Comment (optional)
                </label>
                <span className="text-[11px] text-slate-400">
                  {comment.length} / {MAX_COMMENT_LENGTH}
                </span>
              </div>
              <Textarea
                id="review-comment"
                placeholder="Kamusta ang service? (e.g. On-time ba, malinis ang gamit, pulido ang gawa?)"
                value={comment}
                disabled={isSubmitting}
                onChange={(e) => setComment(e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            {/* Photos */}
            <ReviewPhotosUploader photos={photos} onChange={setPhotos} disabled={isSubmitting} />

            {/* Action buttons */}
            <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-[44px] flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="min-h-[44px] flex-1 bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Post Review"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
