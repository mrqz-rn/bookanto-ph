"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ReportStatus } from "@/lib/db/schema/enums";
import { formatDateTime } from "@/lib/time";

import { REPORT_STATUS_COLORS } from "../../constants";
import { ResolveDisputeModal } from "./resolve-dispute-modal";

type DisputeItem = {
  id: string;
  bookingId: string | null;
  reviewId: string | null;
  reason: string;
  status: ReportStatus;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  reporterId: string;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  booking: {
    id: string;
    refCode: string;
    status: string;
    shopName: string;
    customerName: string | null;
  } | null;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    hidden: boolean;
    shopName: string;
  } | null;
};

type DisputesManagerProps = {
  disputes: DisputeItem[];
  total: number;
  currentStatus?: ReportStatus;
  currentTargetType?: "booking" | "review";
};

export function DisputesManager({
  disputes,
  currentStatus,
  currentTargetType,
}: DisputesManagerProps) {
  const router = useRouter();
  const [selectedDispute, setSelectedDispute] = React.useState<DisputeItem | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const updateFilters = (status?: string, target?: string) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (target && target !== "all") params.set("target", target);
    router.push(`/admin/disputes?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 text-xs font-semibold text-neutral-700">
            {(["all", "open", "resolved", "dismissed"] as const).map((s) => {
              const isActive = (currentStatus ?? "all") === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateFilters(s, currentTargetType ?? "all")}
                  className={`rounded-md px-3 py-1.5 capitalize transition-colors ${
                    isActive
                      ? "bg-white font-bold text-neutral-900 shadow-2xs"
                      : "text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Target Type Filter */}
          <select
            value={currentTargetType ?? "all"}
            onChange={(e) => updateFilters(currentStatus ?? "all", e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
          >
            <option value="all">All Dispute Types</option>
            <option value="booking">Booking Disputes</option>
            <option value="review">Review Reports</option>
          </select>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-xs text-neutral-500 shadow-2xs">
            No disputes or reports found matching the selected filter.
          </div>
        ) : (
          disputes.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        item.bookingId
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {item.bookingId ? "Booking Dispute" : "Review Moderation"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                        REPORT_STATUS_COLORS[item.status]
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Filed {formatDateTime(item.createdAt)}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-neutral-900">
                    &ldquo;{item.reason}&rdquo;
                  </h3>

                  <p className="mt-1 text-xs text-neutral-600">
                    Reported by:{" "}
                    <span className="font-semibold text-neutral-900">
                      {item.reporterName || "User"}
                    </span>{" "}
                    ({item.reporterPhone || item.reporterEmail || "No contact"})
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant={item.status === "open" ? "default" : "outline"}
                    onClick={() => {
                      setSelectedDispute(item);
                      setModalOpen(true);
                    }}
                    className={`text-xs ${
                      item.status === "open"
                        ? "bg-green-700 text-white hover:bg-green-800"
                        : "text-neutral-700"
                    }`}
                  >
                    {item.status === "open" ? "Review & Resolve" : "Edit Resolution"}
                  </Button>
                </div>
              </div>

              {/* Related Record Box */}
              <div className="mt-4 rounded-lg border border-neutral-200/80 bg-neutral-50 p-3 text-xs">
                {item.booking && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        Booking #{item.booking.refCode}
                      </span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-neutral-700">Shop: {item.booking.shopName}</span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-neutral-700">
                        Customer: {item.booking.customerName}
                      </span>
                    </div>
                    <Link
                      href={`/admin/bookings?q=${item.booking.refCode}`}
                      className="font-semibold text-green-700 hover:underline"
                    >
                      Inspect Booking →
                    </Link>
                  </div>
                )}

                {item.review && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                        <span>{item.review.rating} ★</span>
                        <span>at {item.review.shopName}</span>
                        {item.review.hidden && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            HIDDEN
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-neutral-600 italic">
                        &ldquo;{item.review.comment}&rdquo;
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Box if resolved */}
              {item.resolution && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle className="size-3.5 text-emerald-700" />
                    <span>Resolution Note:</span>
                  </div>
                  <p className="mt-1">{item.resolution}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ResolveDisputeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dispute={selectedDispute}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
