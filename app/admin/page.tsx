import { Suspense } from "react";
import type { Metadata } from "next";

import {
  OverviewDashboard,
  OverviewDashboardSkeleton,
} from "@/features/admin/components/overview/overview-dashboard";
import { getAdminOverviewStats } from "@/features/admin/queries";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { formatManila } from "@/lib/time";

export const metadata: Metadata = {
  title: "Admin Overview | BooKanto",
};

async function OverviewData() {
  const user = await requireUser();
  // The audit log is for super admins only (RBAC: admin:audit.read).
  const stats = await getAdminOverviewStats({ includeAudit: can(user, "admin:audit.read") });
  return <OverviewDashboard stats={stats} />;
}

export default function AdminOverviewPage() {
  const now = new Date();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-navy-900">Overview</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {formatManila(now, "EEEE, MMMM d")} · figures as of {formatManila(now, "h:mm a")}
        </p>
      </header>

      <Suspense fallback={<OverviewDashboardSkeleton />}>
        <OverviewData />
      </Suspense>
    </div>
  );
}
