import { redirect } from "next/navigation";

import { RevenueReports } from "@/features/bookings/components/revenue-reports";
import { getShopBookings, getShopRevenueStats } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  const { period = "30d" } = await searchParams;
  const validPeriods = ["today", "7d", "30d", "month", "year", "all"] as const;
  const selectedPeriod = validPeriods.includes(period as (typeof validPeriods)[number])
    ? (period as (typeof validPeriods)[number])
    : "30d";

  const [stats, bookings] = await Promise.all([
    getShopRevenueStats(shop.id, selectedPeriod),
    getShopBookings({ shopId: shop.id, limit: 200 }),
  ]);

  return (
    <RevenueReports
      shopId={shop.id}
      shopName={shop.name}
      stats={stats}
      bookings={bookings}
      currentPeriod={selectedPeriod}
    />
  );
}
