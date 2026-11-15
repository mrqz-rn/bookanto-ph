"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Eye, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/time";

import { AuditPayloadModal } from "./audit-payload-modal";

type AuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  data: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

type AuditLogViewerProps = {
  logs: AuditEntry[];
  total: number;
  currentAction?: string;
  currentTargetType?: string;
};

const TARGET_TYPES = [
  "all",
  "shop",
  "user",
  "booking",
  "category",
  "report",
  "announcement",
  "fraud_signal",
  "system",
];

export function AuditLogViewer({
  logs,
  currentAction = "",
  currentTargetType = "all",
}: AuditLogViewerProps) {
  const router = useRouter();
  const [actionSearch, setActionSearch] = React.useState(currentAction);
  const [targetType, setTargetType] = React.useState(currentTargetType);
  const [selectedLog, setSelectedLog] = React.useState<AuditEntry | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const updateFilters = (act: string, tt: string) => {
    const params = new URLSearchParams();
    if (act.trim()) params.set("action", act.trim());
    if (tt !== "all") params.set("targetType", tt);
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(actionSearch, targetType);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Target Type Filter */}
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              updateFilters(actionSearch, e.target.value);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
          >
            {TARGET_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt === "all" ? "All Target Types" : tt.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Action search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 size-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search action e.g. shop.verified"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="pl-8 font-mono text-xs"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Target ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No audit records found matching current query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setModalOpen(true);
                    }}
                    className="cursor-pointer transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">{log.action}</td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900">
                        {log.actorName || log.actorEmail || "System Automation"}
                      </p>
                    </td>

                    <td className="px-4 py-3 font-semibold text-neutral-700 uppercase">
                      {log.targetType}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">
                      {log.targetId.slice(0, 12)}...
                    </td>

                    <td className="px-4 py-3 text-neutral-500">{formatDateTime(log.createdAt)}</td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                          setModalOpen(true);
                        }}
                        className="h-7 px-2 text-neutral-600"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AuditPayloadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} log={selectedLog} />
    </div>
  );
}
