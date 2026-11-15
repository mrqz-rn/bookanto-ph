"use client";

import * as React from "react";
import { CheckCircle2, Loader2, MessageSquare, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { replyToReview } from "../actions";
import { MAX_REPLY_LENGTH } from "../constants";

type ShopReplyDialogProps = {
  reviewId: string;
  shopId: string;
  customerName: string;
  customerRating: number;
  customerComment: string | null;
  existingReply: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newReply: string) => void;
};

export function ShopReplyDialog({
  reviewId,
  shopId,
  customerName,
  customerRating,
  customerComment,
  existingReply,
  isOpen,
  onClose,
  onSuccess,
}: ShopReplyDialogProps) {
  const [replyText, setReplyText] = React.useState(existingReply || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReplyText(existingReply || "");
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isOpen, existingReply]);

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
    const trimmed = replyText.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a reply message.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await replyToReview({
        reviewId,
        shopId,
        reply: trimmed,
      });

      if (!res.ok) {
        setErrorMessage(res.message || "Failed to post reply. Please try again.");
        return;
      }

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess(trimmed);
      }
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-dialog-title"
      className="bg-navy-950/60 fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-accent text-green-700">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <h2 id="reply-dialog-title" className="font-display text-lg font-bold text-navy-900">
                {existingReply ? "Edit shop reply" : "Reply to review"}
              </h2>
              <p className="text-xs text-slate-500">
                Your reply will be displayed publicly under this review.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="flex size-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-900"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Customer review context preview */}
        <div className="mt-4 rounded-lg border border-border bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-navy-900">{customerName}</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
              <Star className="size-3.5 fill-amber-400 text-amber-500" />
              {customerRating} / 5
            </span>
          </div>
          {customerComment ? (
            <p className="mt-1.5 text-slate-700 italic">&quot;{customerComment}&quot;</p>
          ) : (
            <p className="mt-1 text-slate-400 italic">No written comment left.</p>
          )}
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="mt-3 font-semibold text-navy-900">Reply published!</h3>
            <p className="mt-1 max-w-xs text-xs text-slate-600">
              Your response is now visible to the customer and public visitors.
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-[44px] w-full bg-green-600 font-semibold text-white hover:bg-green-700"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger"
              >
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="shop-reply-text" className="text-xs font-semibold text-slate-700">
                  Shop Response *
                </label>
                <span className="text-[11px] text-slate-400">
                  {replyText.length} / {MAX_REPLY_LENGTH}
                </span>
              </div>
              <Textarea
                id="shop-reply-text"
                placeholder="Thank the customer, address feedback professionally, or invite them back..."
                value={replyText}
                disabled={isSubmitting}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={MAX_REPLY_LENGTH}
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
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
                disabled={isSubmitting || !replyText.trim()}
                className="min-h-[44px] flex-1 bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Publishing...
                  </>
                ) : existingReply ? (
                  "Update Reply"
                ) : (
                  "Post Reply"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
