import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ShopAnalyticsView } from "@/features/analytics/components/shop-analytics-view";
import type { AnalyticsPeriod } from "@/features/analytics/constants";
import { getCohortReport, getShopAnalytics } from "@/features/analytics/queries";
import { getUserShops } from "@/features/shops/queries";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Shop Analytics & Reports | BooKanto Partner Dashboard",
  description:
    "Shop performance, booking funnel conversion, peak hours heatmap, and customer cohort retention.",
};

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

const VALID_PERIODS: readonly AnalyticsPeriod[] = ["today", "7d", "30d", "90d", "pilot", "all"];

export default async function ReportsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  assertCan(user, "analytics:read_shop", { shopId: shop.id });

  const { period = "30d" } = await searchParams;
  const selectedPeriod: AnalyticsPeriod = VALID_PERIODS.includes(period as AnalyticsPeriod)
    ? (period as AnalyticsPeriod)
    : "30d";

  const [stats, cohorts] = await Promise.all([
    getShopAnalytics(shop.id, { period: selectedPeriod }),
    getCohortReport({ shopId: shop.id, periodType: "monthly", periodsCount: 6 }),
  ]);

  return <ShopAnalyticsView stats={stats} cohorts={cohorts} currentPeriod={selectedPeriod} />;
}
