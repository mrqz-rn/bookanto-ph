"use client";

import * as React from "react";
import { AlertCircle, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { declineBooking } from "../actions";

type DeclineDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  refCode?: string;
  onSuccess?: () => void;
};

const PRESET_REASONS = [
  "Shop is fully booked at this hour",
  "Assigned staff member is unavailable",
  "Requested service is temporarily unavailable",
  "Outside standard shop operating hours",
];

export function DeclineDialog({
  isOpen,
  onClose,
  bookingId,
  refCode,
  onSuccess,
}: DeclineDialogProps) {
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
      setError("Please provide a reason for declining.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await declineBooking({
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
      setError(err instanceof Error ? err.message : "Failed to decline booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h3 className="font-display text-base font-bold text-neutral-900">
            Decline Booking Request {refCode ? `(${refCode})` : ""}
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
            Declining will inform the customer that their booking could not be accommodated. A
            reason is required.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Choose Preset Reason
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    reason === preset
                      ? "border-rose-300 bg-rose-50 font-semibold text-rose-900"
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
              Reason Details <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain politely why this booking cannot be confirmed..."
              className="mt-1 w-full rounded-md border border-neutral-300 p-2.5 text-xs text-neutral-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
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
              className="bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
            >
              {loading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Decline Booking
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
