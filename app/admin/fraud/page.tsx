import type { Metadata } from "next";

import { FraudSignalsDashboard } from "@/features/admin/components/fraud/fraud-signals-dashboard";
import { getAdminFraudSignals } from "@/features/admin/queries";
import type { FraudSeverity, FraudStatus, FraudTargetType } from "@/lib/db/schema/enums";

export const metadata: Metadata = {
  title: "Fraud Signals | BooKanto Admin",
};

type AdminFraudPageProps = {
  searchParams: Promise<{
    severity?: string;
    status?: string;
    targetType?: string;
  }>;
};

export default async function AdminFraudPage({ searchParams }: AdminFraudPageProps) {
  const { severity, status, targetType } = await searchParams;

  const validSeverity =
    severity && ["low", "medium", "high", "critical"].includes(severity)
      ? (severity as FraudSeverity)
      : undefined;

  const validStatus =
    status && ["active", "investigating", "resolved", "dismissed"].includes(status)
      ? (status as FraudStatus)
      : undefined;

  const validTarget =
    targetType && ["user", "shop", "booking"].includes(targetType)
      ? (targetType as FraudTargetType)
      : undefined;

  const { signals, total } = await getAdminFraudSignals({
    severity: validSeverity,
    status: validStatus,
    targetType: validTarget,
  });

  return (
    <div className="space-y-6">
      <FraudSignalsDashboard
        signals={signals}
        total={total}
        currentSeverity={validSeverity}
        currentStatus={validStatus}
        currentTargetType={validTarget}
      />
    </div>
  );
}
