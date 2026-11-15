"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Flag, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { reportReview } from "../actions";
import { REPORT_REASONS, type ReportReasonValue } from "../constants";

type ReportReviewDialogProps = {
  reviewId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ReportReviewDialog({ reviewId, isOpen, onClose }: ReportReviewDialogProps) {
  const [reasonType, setReasonType] = React.useState<ReportReasonValue>("spam");
  const [reasonDetails, setReasonDetails] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReasonType("spam");
      setReasonDetails("");
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

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
    const finalReason = reasonDetails.trim()
      ? reasonDetails.trim()
      : REPORT_REASONS.find((r) => r.value === reasonType)?.label ||
        "Reported for community guideline review";

    if (finalReason.length < 3) {
      setErrorMessage(
        "Please enter at least 3 characters explaining why this review should be reviewed.",
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await reportReview({
        reviewId,
        reason: finalReason,
        reasonType,
      });

      if (!res.ok) {
        setErrorMessage(res.message || "Failed to submit report. Please try again.");
        return;
      }

      setIsSuccess(true);
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
      aria-labelledby="report-dialog-title"
      className="bg-navy-950/60 fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-red-100 text-danger">
              <Flag className="size-4" />
            </div>
            <div>
              <h2 id="report-dialog-title" className="font-display text-lg font-bold text-navy-900">
                Report this review
              </h2>
              <p className="text-xs text-slate-500">
                Help keep the BooKanto community safe and reliable.
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

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="mt-3 font-semibold text-navy-900">Report received</h3>
            <p className="mt-1 max-w-xs text-xs text-slate-600">
              Thank you for letting us know. Our moderation team will inspect this review against
              our community standards.
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="hover:bg-navy-800 mt-5 min-h-[44px] w-full bg-navy-900 text-white"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">Select an issue *</label>
              <div className="flex flex-col gap-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3 text-xs transition-colors ${
                      reasonType === reason.value
                        ? "border-primary bg-accent/30 font-medium text-navy-900"
                        : "border-border text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason.value}
                      checked={reasonType === reason.value}
                      onChange={() => setReasonType(reason.value)}
                      className="size-4 text-green-600 focus:ring-primary"
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-details" className="text-xs font-semibold text-slate-700">
                Additional context (optional)
              </label>
              <Textarea
                id="report-details"
                placeholder="Give more details to help our moderation team review this faster..."
                value={reasonDetails}
                disabled={isSubmitting}
                onChange={(e) => setReasonDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                className="resize-none text-xs"
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
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
                disabled={isSubmitting}
                className="min-h-[44px] flex-1 bg-red-600 font-semibold text-white hover:bg-red-700 sm:flex-initial"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
