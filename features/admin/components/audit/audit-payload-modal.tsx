"use client";

import * as React from "react";
import { History, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";

type AuditLogItem = {
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

type AuditPayloadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogItem | null;
};

export function AuditPayloadModal({ isOpen, onClose, log }: AuditPayloadModalProps) {
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-purple-700" />
            <h3 className="font-mono text-sm font-bold text-neutral-900">{log.action}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Actor</span>
              <p className="font-semibold text-neutral-900">
                {log.actorName || log.actorEmail || "System Automation"}
              </p>
              <p className="text-[11px] text-neutral-500">{log.actorEmail || "No email"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Target</span>
              <p className="font-semibold text-neutral-900 uppercase">{log.targetType}</p>
              <p className="font-mono text-[11px] text-neutral-500">{log.targetId}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Timestamp</span>
              <p className="text-neutral-900">{formatDateTime(log.createdAt)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase">IP Address</span>
              <p className="font-mono text-neutral-900">{log.ip || "127.0.0.1"}</p>
            </div>
          </div>

          <div>
            <span className="font-semibold text-neutral-700">Audit Data Payload (JSON)</span>
            <pre className="mt-1.5 max-h-60 overflow-y-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-emerald-400">
              {log.data ? JSON.stringify(log.data, null, 2) : "No extra data payload"}
            </pre>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-neutral-100 pt-3">
          <Button type="button" size="sm" variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
