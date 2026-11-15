"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  History,
  Megaphone,
  Scale,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/time";

import { verifyShop } from "../../actions";

type OverviewMetricsProps = {
  stats: {
    pendingShopsCount: number;
    activeShopsCount: number;
    totalUsersCount: number;
    totalBookingsCount: number;
    openReportsCount: number;
    activeFraudSignalsCount: number;
    activeAnnouncementsCount: number;
    recentPending: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      createdAt: Date;
      ownerName: string | null;
      ownerPhone: string | null;
    }>;
    recentReports: Array<{
      id: string;
      reason: string;
      status: string;
      bookingId: string | null;
      reviewId: string | null;
      createdAt: Date;
      reporterName: string | null;
    }>;
    recentSignals: Array<{
      id: string;
      targetType: string;
      targetId: string;
      signalType: string;
      severity: string;
      score: number;
      status: string;
      createdAt: Date;
    }>;
    recentAudit: Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string;
      createdAt: Date;
      actorName: string | null;
      actorEmail: string | null;
    }>;
  };
};

export function OverviewMetrics({ stats }: OverviewMetricsProps) {
  const router = useRouter();
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const handleQuickApprove = async (shopId: string) => {
    setApprovingId(shopId);
    try {
      const res = await verifyShop({ shopId });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Approvals */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">
              Pending Approvals
            </span>
            <span className="rounded-md bg-amber-200/80 p-2 text-amber-900">
              <Store className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-amber-950">
              {stats.pendingShopsCount}
            </span>
            <span className="text-xs text-amber-700">shops awaiting review</span>
          </div>
          <div className="mt-4 border-t border-amber-200/60 pt-3">
            <Link
              href="/admin/shops?status=pending"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
            >
              Go to approval queue <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Open Disputes */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-rose-800 uppercase">
              Open Disputes
            </span>
            <span className="rounded-md bg-rose-200/80 p-2 text-rose-900">
              <Scale className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-rose-950">
              {stats.openReportsCount}
            </span>
            <span className="text-xs text-rose-700">unresolved disputes</span>
          </div>
          <div className="mt-4 border-t border-rose-200/60 pt-3">
            <Link
              href="/admin/disputes?status=open"
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-900 hover:underline"
            >
              Resolve disputes <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Fraud Signals */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-purple-800 uppercase">
              Active Fraud Signals
            </span>
            <span className="rounded-md bg-purple-200/80 p-2 text-purple-900">
              <ShieldAlert className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-purple-950">
              {stats.activeFraudSignalsCount}
            </span>
            <span className="text-xs text-purple-700">flagged accounts</span>
          </div>
          <div className="mt-4 border-t border-purple-200/60 pt-3">
            <Link
              href="/admin/fraud"
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-900 hover:underline"
            >
              Inspect fraud signals <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Active Shops */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
              Active Shops
            </span>
            <span className="rounded-md bg-emerald-200/80 p-2 text-emerald-900">
              <CheckCircle2 className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-emerald-950">
              {stats.activeShopsCount}
            </span>
            <span className="text-xs text-emerald-700">verified merchants</span>
          </div>
          <div className="mt-4 border-t border-emerald-200/60 pt-3">
            <Link
              href="/admin/shops?status=active"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-900 hover:underline"
            >
              View active directory <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Calendar className="size-4" /> Total Bookings
          </div>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900">
            {stats.totalBookingsCount}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Users className="size-4" /> Total Users
          </div>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900">
            {stats.totalUsersCount}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Megaphone className="size-4" /> Active Announcements
          </div>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900">
            {stats.activeAnnouncementsCount}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <History className="size-4" /> Audit Events Today
          </div>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900">
            {stats.recentAudit.length}
          </p>
        </div>
      </div>

      {/* Urgent Queues & Operational Pulse */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Shops Awaiting Verification */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Shops Awaiting Approval</h2>
              <p className="text-xs text-neutral-500">
                Newly registered merchants waiting for document verification
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/admin/shops?status=pending">View All ({stats.pendingShopsCount})</Link>
            </Button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {stats.recentPending.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                No shops currently awaiting verification.
              </p>
            ) : (
              stats.recentPending.map((shop) => (
                <div key={shop.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/admin/shops/${shop.id}`}
                      className="text-sm font-semibold text-neutral-900 hover:text-green-700"
                    >
                      {shop.name}
                    </Link>
                    <p className="text-xs text-neutral-500">
                      Owner: {shop.ownerName || "Unknown"} • {shop.ownerPhone || "No phone"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approvingId === shop.id}
                      onClick={() => handleQuickApprove(shop.id)}
                      className="border-emerald-300 text-xs text-emerald-800 hover:bg-emerald-50"
                    >
                      {approvingId === shop.id ? "Approving..." : "Approve"}
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-xs">
                      <Link href={`/admin/shops/${shop.id}`}>Review</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Open Disputes */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Urgent Disputes & Reports</h2>
              <p className="text-xs text-neutral-500">Booking grievances and flagged reviews</p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/admin/disputes?status=open">View All ({stats.openReportsCount})</Link>
            </Button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {stats.recentReports.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                No open reports or disputes. Platform is healthy.
              </p>
            ) : (
              stats.recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between py-3">
                  <div className="max-w-[70%]">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
                      {report.bookingId ? "Booking Dispute" : "Review Report"}
                    </span>
                    <p className="mt-1 truncate text-xs font-semibold text-neutral-900">
                      {report.reason}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Reported by {report.reporterName || "Anonymous"}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/admin/disputes`}>Resolve</Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Fraud Signals */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Top Risk Signals</h2>
              <p className="text-xs text-neutral-500">
                Accounts flagged for abusive cancellations, burst velocity, or no-shows
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/admin/fraud">All Signals ({stats.activeFraudSignalsCount})</Link>
            </Button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {stats.recentSignals.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                No active fraud signals detected.
              </p>
            ) : (
              stats.recentSignals.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          sig.severity === "critical"
                            ? "bg-rose-100 font-bold text-rose-800"
                            : sig.severity === "high"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sig.severity} (Score: {sig.score})
                      </span>
                      <span className="text-xs font-semibold text-neutral-900 capitalize">
                        {sig.signalType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      Target: {sig.targetType} ({sig.targetId.slice(0, 8)}...)
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="text-xs">
                    <Link href="/admin/fraud">Inspect</Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Log Stream */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Recent Admin Activity</h2>
              <p className="text-xs text-neutral-500">
                Audit trail of actions taken across the platform
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/admin/audit">Full Audit Log</Link>
            </Button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {stats.recentAudit.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                No audit events recorded yet.
              </p>
            ) : (
              stats.recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2.5">
                  <div className="truncate pr-3">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {log.action}
                    </span>
                    <p className="text-[11px] text-neutral-500">
                      by {log.actorName || log.actorEmail || "System"} on {log.targetType} (
                      {log.targetId.slice(0, 8)}...)
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-neutral-500">
                    {formatTimeAgo(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
