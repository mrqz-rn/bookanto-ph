"use client";

import Link from "next/link";
import * as React from "react";
import { Ban, ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FraudSeverity, FraudStatus } from "@/lib/db/schema/enums";
import { formatDateTime } from "@/lib/time";

import { suspendShop, suspendUser, updateFraudSignalStatus } from "../../actions";
import { FRAUD_SEVERITY_COLORS } from "../../constants";

type SignalItem = {
  id: string;
  targetType: string;
  targetId: string;
  signalType: string;
  severity: FraudSeverity;
  status: FraudStatus;
  score: number;
  details: Record<string, unknown> | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  resolvedByName: string | null;
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  targetShop: { id: string; name: string; slug: string; phone: string | null } | null;
};

type FraudSignalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  signal: SignalItem | null;
  onSuccess: () => void;
};

export function FraudSignalModal({ isOpen, onClose, signal, onSuccess }: FraudSignalModalProps) {
  const [status, setStatus] = React.useState<FraudStatus>("active");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [suspending, setSuspending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (signal) {
      setStatus(signal.status);
      setNotes(signal.resolutionNotes ?? "");
    }
    setError(null);
  }, [signal, isOpen]);

  if (!isOpen || !signal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await updateFraudSignalStatus({
        id: signal.id,
        status,
        resolutionNotes: notes.trim() || null,
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

  const handleQuickSuspend = async () => {
    if (!window.confirm(`Are you sure you want to suspend this ${signal.targetType}?`)) return;
    setSuspending(true);
    try {
      if (signal.targetType === "user") {
        await suspendUser({
          userId: signal.targetId,
          reason: `Fraud signal: ${signal.signalType} (Risk score: ${signal.score})`,
        });
      } else if (signal.targetType === "shop") {
        await suspendShop({
          shopId: signal.targetId,
          reason: `Fraud signal: ${signal.signalType} (Risk score: ${signal.score})`,
        });
      }
      onSuccess();
      onClose();
    } catch {
      setError("Failed to suspend target.");
    } finally {
      setSuspending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${
                FRAUD_SEVERITY_COLORS[signal.severity]
              }`}
            >
              {signal.severity} (Score: {signal.score})
            </span>
            <h3 className="font-bold text-neutral-900 capitalize">
              {signal.signalType.replace(/_/g, " ")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Target Profile Card */}
        <div className="mt-4 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Flagged Target: {signal.targetType}
            </span>
            <span className="text-[11px] text-neutral-400">
              Detected {formatDateTime(signal.createdAt)}
            </span>
          </div>

          {signal.targetUser && (
            <div>
              <p className="font-bold text-neutral-900">{signal.targetUser.name || "Customer"}</p>
              <p className="text-[11px] text-neutral-600">
                {signal.targetUser.email} • {signal.targetUser.phone}
              </p>
              <Link
                href={`/admin/users/${signal.targetUser.id}`}
                className="mt-1 inline-flex items-center gap-1 font-semibold text-green-700 hover:underline"
              >
                Inspect User History <ExternalLink className="size-3" />
              </Link>
            </div>
          )}

          {signal.targetShop && (
            <div>
              <p className="font-bold text-neutral-900">{signal.targetShop.name}</p>
              <p className="font-mono text-[11px] text-neutral-600">
                /{signal.targetShop.slug} • {signal.targetShop.phone}
              </p>
              <Link
                href={`/admin/shops/${signal.targetShop.id}`}
                className="mt-1 inline-flex items-center gap-1 font-semibold text-green-700 hover:underline"
              >
                Inspect Shop Profile <ExternalLink className="size-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Details Payload */}
        {signal.details && (
          <div className="mt-3">
            <span className="text-xs font-semibold text-neutral-700">Detection Signal Details</span>
            <pre className="mt-1 max-h-36 overflow-y-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-emerald-400">
              {JSON.stringify(signal.details, null, 2)}
            </pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-neutral-700">Signal Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FraudStatus)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
            >
              <option value="active">Active (Needs Review)</option>
              <option value="investigating">Investigating (In Progress)</option>
              <option value="resolved">Resolved (Action Taken)</option>
              <option value="dismissed">Dismissed (False Positive)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">
              Resolution or Investigation Notes
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Verified customer had legitimate medical emergency for cancellations, dismissed alert."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {/* Quick Action: Direct Suspend */}
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 p-3">
            <div>
              <span className="text-xs font-bold text-rose-950">Immediate Account Protection</span>
              <p className="text-[11px] text-rose-800">
                Immediately suspend this {signal.targetType} from booking or hosting.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={suspending}
              onClick={handleQuickSuspend}
              className="border-rose-300 text-xs text-rose-700 hover:bg-rose-100"
            >
              <Ban className="mr-1 size-3" /> Suspend
            </Button>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-green-700 text-xs text-white hover:bg-green-800"
            >
              {loading ? "Updating..." : "Update Signal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
