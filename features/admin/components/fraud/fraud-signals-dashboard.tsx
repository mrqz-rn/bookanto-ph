"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Eye, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FraudSeverity, FraudStatus, FraudTargetType } from "@/lib/db/schema/enums";
import { formatDateTime } from "@/lib/time";

import { triggerFraudScan } from "../../actions";
import { FRAUD_SEVERITY_COLORS, FRAUD_STATUS_COLORS } from "../../constants";
import { FraudSignalModal } from "./fraud-signal-modal";

type SignalRow = {
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

type FraudSignalsDashboardProps = {
  signals: SignalRow[];
  total: number;
  currentSeverity?: FraudSeverity;
  currentStatus?: FraudStatus;
  currentTargetType?: FraudTargetType;
};

export function FraudSignalsDashboard({
  signals,
  currentSeverity,
  currentStatus,
  currentTargetType,
}: FraudSignalsDashboardProps) {
  const router = useRouter();
  const [selectedSignal, setSelectedSignal] = React.useState<SignalRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<string | null>(null);

  const updateFilters = (sev?: string, st?: string, tt?: string) => {
    const params = new URLSearchParams();
    if (sev && sev !== "all") params.set("severity", sev);
    if (st && st !== "all") params.set("status", st);
    if (tt && tt !== "all") params.set("targetType", tt);
    router.push(`/admin/fraud?${params.toString()}`);
  };

  const handleRunScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await triggerFraudScan({});
      if (res.ok) {
        setScanResult(
          `Fraud scan complete. ${res.data.scanned} signals evaluated, ${res.data.newSignals} new signals flagged.`,
        );
        router.refresh();
      } else {
        setScanResult(`Scan error: ${res.message}`);
      }
    } catch {
      setScanResult("Failed to execute scan.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Trigger Scan Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Fraud & Abuse Signals</h2>
          <p className="text-xs text-neutral-500">
            Real-time anomaly detection for excessive cancellations, burst velocity, and repeated
            no-shows.
          </p>
        </div>

        <Button
          onClick={handleRunScan}
          disabled={scanning}
          size="sm"
          className="bg-purple-700 text-xs text-white hover:bg-purple-800"
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning System..." : "Run Fraud Detection Scan"}
        </Button>
      </div>

      {scanResult && (
        <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-3.5 text-xs font-semibold text-purple-900">
          <span>{scanResult}</span>
          <button
            type="button"
            onClick={() => setScanResult(null)}
            className="text-purple-600 hover:text-purple-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity */}
        <select
          value={currentSeverity ?? "all"}
          onChange={(e) =>
            updateFilters(e.target.value, currentStatus ?? "all", currentTargetType ?? "all")
          }
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status */}
        <select
          value={currentStatus ?? "all"}
          onChange={(e) =>
            updateFilters(currentSeverity ?? "all", e.target.value, currentTargetType ?? "all")
          }
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active (Needs Review)</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>

        {/* Target Type */}
        <select
          value={currentTargetType ?? "all"}
          onChange={(e) =>
            updateFilters(currentSeverity ?? "all", currentStatus ?? "all", e.target.value)
          }
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
        >
          <option value="all">All Targets</option>
          <option value="user">Users</option>
          <option value="shop">Shops</option>
        </select>
      </div>

      {/* Signals Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Severity & Score</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Signal Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Detected</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {signals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No fraud signals found. Use &ldquo;Run Fraud Detection Scan&rdquo; to analyze
                    recent platform activity.
                  </td>
                </tr>
              ) : (
                signals.map((sig) => (
                  <tr
                    key={sig.id}
                    onClick={() => {
                      setSelectedSignal(sig);
                      setModalOpen(true);
                    }}
                    className="cursor-pointer transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            FRAUD_SEVERITY_COLORS[sig.severity]
                          }`}
                        >
                          {sig.severity}
                        </span>
                        <span className="font-mono font-bold text-neutral-900">
                          {sig.score}/100
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {sig.targetType === "user" && sig.targetUser && (
                        <div>
                          <p className="font-bold text-neutral-900">
                            {sig.targetUser.name || "User"}
                          </p>
                          <p className="text-[11px] text-neutral-500">{sig.targetUser.email}</p>
                        </div>
                      )}
                      {sig.targetType === "shop" && sig.targetShop && (
                        <div>
                          <p className="font-bold text-neutral-900">{sig.targetShop.name}</p>
                          <p className="font-mono text-[11px] text-neutral-500">
                            /{sig.targetShop.slug}
                          </p>
                        </div>
                      )}
                      {!sig.targetUser && !sig.targetShop && (
                        <span className="font-mono text-neutral-500">
                          {sig.targetType}: {sig.targetId.slice(0, 8)}...
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-neutral-900 capitalize">
                        {sig.signalType.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                          FRAUD_STATUS_COLORS[sig.status]
                        }`}
                      >
                        {sig.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-neutral-500">
                      {formatDateTime(sig.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSignal(sig);
                          setModalOpen(true);
                        }}
                        className="h-7 text-xs"
                      >
                        <Eye className="mr-1 size-3" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FraudSignalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        signal={selectedSignal}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
