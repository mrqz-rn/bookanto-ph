import type { Metadata } from "next";

import { OverviewMetrics } from "@/features/admin/components/overview/overview-metrics";
import { getAdminOverviewStats } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Admin Overview | BooKanto",
};

export default async function AdminOverviewPage() {
  const stats = await getAdminOverviewStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900">Platform Overview</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Live pulse of shop registrations, booking activity, open disputes, and fraud alerts.
        </p>
      </div>

      <OverviewMetrics stats={stats} />
    </div>
  );
}
