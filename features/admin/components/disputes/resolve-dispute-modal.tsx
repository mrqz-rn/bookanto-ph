"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { resolveDispute } from "../../actions";

type DisputeData = {
  id: string;
  reason: string;
  status: string;
  bookingId: string | null;
  reviewId: string | null;
  reporterName: string | null;
  booking?: {
    refCode: string;
    shopName: string;
    customerName: string | null;
  } | null;
  review?: {
    rating: number;
    comment: string | null;
    shopName: string;
  } | null;
};

type ResolveDisputeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  dispute: DisputeData | null;
  onSuccess: () => void;
};

export function ResolveDisputeModal({
  isOpen,
  onClose,
  dispute,
  onSuccess,
}: ResolveDisputeModalProps) {
  const [resolution, setResolution] = React.useState("");
  const [status, setStatus] = React.useState<"resolved" | "dismissed">("resolved");
  const [hideAssociatedReview, setHideAssociatedReview] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setResolution("");
    setStatus("resolved");
    setHideAssociatedReview(false);
    setError(null);
  }, [isOpen, dispute]);

  if (!isOpen || !dispute) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await resolveDispute({
        reportId: dispute.id,
        status,
        resolution: resolution.trim(),
        hideAssociatedReview,
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-neutral-900">
            {dispute.bookingId ? "Resolve Booking Dispute" : "Moderate Reported Review"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Dispute Summary Context */}
        <div className="mt-4 space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-700">
              Reported by {dispute.reporterName || "Anonymous"}
            </span>
            <span className="font-mono text-[11px] text-neutral-500">
              ID: {dispute.id.slice(0, 8)}
            </span>
          </div>
          <p className="font-semibold text-neutral-900">&ldquo;{dispute.reason}&rdquo;</p>

          {dispute.booking && (
            <div className="mt-2 border-t border-neutral-200 pt-2 text-[11px] text-neutral-600">
              Booking: <span className="font-mono font-bold">#{dispute.booking.refCode}</span> at{" "}
              <span className="font-semibold">{dispute.booking.shopName}</span>
            </div>
          )}

          {dispute.review && (
            <div className="mt-2 border-t border-neutral-200 pt-2 text-[11px] text-neutral-600">
              Review: {dispute.review.rating} ★ at{" "}
              <span className="font-semibold">{dispute.review.shopName}</span>: &ldquo;
              {dispute.review.comment}&rdquo;
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Outcome Decision */}
          <div>
            <label className="text-xs font-semibold text-neutral-700">Resolution Decision</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                  status === "resolved"
                    ? "border-emerald-600 bg-emerald-50/50 font-bold"
                    : "border-neutral-200"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="resolved"
                  checked={status === "resolved"}
                  onChange={() => setStatus("resolved")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-emerald-950">Resolve (Action Taken)</span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                  status === "dismissed"
                    ? "border-neutral-600 bg-neutral-100 font-bold"
                    : "border-neutral-200"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="dismissed"
                  checked={status === "dismissed"}
                  onChange={() => setStatus("dismissed")}
                  className="text-neutral-600 focus:ring-neutral-500"
                />
                <span className="text-neutral-800">Dismiss (No Violation)</span>
              </label>
            </div>
          </div>

          {/* Optional: Hide Review */}
          {dispute.reviewId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={hideAssociatedReview}
                  onChange={(e) => setHideAssociatedReview(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-amber-950">
                    Hide review from shop profile
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Removes this review from public display and automatically recalculates the
                    shop&apos;s star rating average and count.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-neutral-700">
              Resolution Summary & Notes
            </label>
            <Textarea
              required
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Explain how the dispute or review report was settled (e.g. verified service completion, refund agreement, or false claim)."
              className="mt-1 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !resolution.trim()}
              className="bg-green-700 text-xs text-white hover:bg-green-800"
            >
              {loading ? "Saving..." : "Submit Resolution"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
