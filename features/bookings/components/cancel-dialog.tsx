"use client";

import * as React from "react";
import { AlertCircle, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cancelBooking } from "../actions";

type CancelDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  refCode?: string;
  onSuccess?: () => void;
};

const PRESET_REASONS = [
  "Customer called to cancel",
  "Emergency shop maintenance or power outage",
  "Double booked / slot conflict",
  "Weather / typhoon disruption",
];

export function CancelDialog({
  isOpen,
  onClose,
  bookingId,
  refCode,
  onSuccess,
}: CancelDialogProps) {
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a cancellation reason.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await cancelBooking({
        bookingId,
        reason: reason.trim(),
      });

      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h3 className="font-display text-base font-bold text-neutral-900">
            Cancel Booking {refCode ? `(${refCode})` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-xs text-neutral-600">
            Cancelling this booking will release the reserved time slot and notify the customer.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-900">Quick Reason</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    reason === preset
                      ? "border-neutral-400 bg-neutral-100 font-semibold text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for cancelling..."
              className="mt-1 w-full rounded-md border border-neutral-300 p-2.5 text-xs text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Back
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-neutral-800 text-xs font-bold text-white hover:bg-neutral-900"
            >
              {loading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
