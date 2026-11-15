import type { Metadata } from "next";

import { DisputesManager } from "@/features/admin/components/disputes/disputes-manager";
import { getAdminDisputes } from "@/features/admin/queries";
import type { ReportStatus } from "@/lib/db/schema/enums";

export const metadata: Metadata = {
  title: "Disputes & Reports | BooKanto Admin",
};

type AdminDisputesPageProps = {
  searchParams: Promise<{
    status?: string;
    target?: string;
  }>;
};

export default async function AdminDisputesPage({ searchParams }: AdminDisputesPageProps) {
  const { status, target } = await searchParams;

  const validStatus =
    status && ["open", "resolved", "dismissed"].includes(status)
      ? (status as ReportStatus)
      : undefined;

  const validTarget = target === "booking" || target === "review" ? target : undefined;

  const { disputes, total } = await getAdminDisputes({
    status: validStatus,
    targetType: validTarget,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900">
          Disputes & Moderation
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Arbitrate booking issues, review customer and merchant reports, and moderate inappropriate
          reviews.
        </p>
      </div>

      <DisputesManager
        disputes={disputes}
        total={total}
        currentStatus={validStatus}
        currentTargetType={validTarget}
      />
    </div>
  );
}
