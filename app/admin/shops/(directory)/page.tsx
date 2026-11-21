import { Suspense } from "react";
import type { Metadata } from "next";

import {
  ShopResults,
  ShopResultsSkeleton,
  ShopSearch,
  ShopStatusTabs,
  type ShopDirectoryFilters,
} from "@/features/admin/components/shops/shop-directory";
import { DEFAULT_PAGE_SIZE } from "@/features/admin/constants";
import { getAdminShops, getAdminShopStatusCounts } from "@/features/admin/queries";
import { SHOP_STATUSES, type ShopStatus } from "@/lib/db/schema/enums";

export const metadata: Metadata = {
  title: "Shops | BooKanto Admin",
};

type AdminShopsPageProps = {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
};

function readFilters(params: Awaited<AdminShopsPageProps["searchParams"]>): ShopDirectoryFilters {
  const status = (SHOP_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as ShopStatus)
    : undefined;
  const page = Number.parseInt(params.page ?? "1", 10);
  return {
    status,
    q: (params.q ?? "").trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

async function Results({ filters }: { filters: ShopDirectoryFilters }) {
  const { shops, total } = await getAdminShops({
    status: filters.status,
    search: filters.q || undefined,
    limit: DEFAULT_PAGE_SIZE,
    offset: (filters.page - 1) * DEFAULT_PAGE_SIZE,
  });
  return <ShopResults shops={shops} total={total} pageSize={DEFAULT_PAGE_SIZE} filters={filters} />;
}

export default async function AdminShopsPage({ searchParams }: AdminShopsPageProps) {
  const filters = readFilters(await searchParams);
  const counts = await getAdminShopStatusCounts();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-navy-900">Shops</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Review new registrations, then open any shop to approve, reject or suspend it.
        </p>
      </header>

      {/* Side by side only where the full tab bar and the search both fit. */}
      <div className="flex flex-col gap-4 min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:justify-between">
        <ShopStatusTabs counts={counts} filters={filters} />
        <ShopSearch filters={filters} />
      </div>

      {/* A new key per filter, so switching tabs or pages shows the skeleton. */}
      <Suspense
        key={`${filters.status ?? "all"}|${filters.q}|${filters.page}`}
        fallback={<ShopResultsSkeleton />}
      >
        <Results filters={filters} />
      </Suspense>
    </div>
  );
}
