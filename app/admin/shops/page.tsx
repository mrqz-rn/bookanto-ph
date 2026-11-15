import type { Metadata } from "next";

import { ShopApprovalTable } from "@/features/admin/components/shops/shop-approval-table";
import { getAdminShops } from "@/features/admin/queries";
import type { ShopStatus } from "@/lib/db/schema/enums";

export const metadata: Metadata = {
  title: "Shop Approval & Verification | BooKanto Admin",
};

type AdminShopsPageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function AdminShopsPage({ searchParams }: AdminShopsPageProps) {
  const { status, q } = await searchParams;

  const validStatus =
    status && ["draft", "pending", "active", "suspended"].includes(status)
      ? (status as ShopStatus)
      : undefined;

  const { shops, total } = await getAdminShops({
    status: validStatus,
    search: q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900">
          Shops Directory & Approvals
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Review verification documents, approve pending storefronts, and manage merchant statuses.
        </p>
      </div>

      <ShopApprovalTable
        initialShops={shops}
        total={total}
        currentStatus={validStatus}
        currentSearch={q ?? ""}
      />
    </div>
  );
}
