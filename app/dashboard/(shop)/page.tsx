import Link from "next/link";
import { ArrowRight, ClipboardList, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TodayView } from "@/features/bookings/components/today-view";
import { getShopHoursForDay, getTodayDashboardData } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";

export default async function DashboardPage() {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-6 text-center sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-green-700">
          <Store aria-hidden className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          List your shop on BooKanto
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Five steps: shop details, map pin, opening hours, photos and documents. Customers can book
          you once our team approves the listing.
        </p>
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
          <Link href="/dashboard/setup">
            Start your listing
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  const isDraft = shop.status === "draft";
  const [todayData, todayHours] = await Promise.all([
    getTodayDashboardData(shop.id),
    getShopHoursForDay(shop.id),
  ]);

  return (
    <div className="space-y-6">
      {isDraft && (
        <div className="flex flex-col gap-4 rounded-2xl border border-yellow-400 bg-cream-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <ClipboardList aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="text-base font-semibold text-navy-900">
                Your listing isn&apos;t live yet
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                Finish your location, opening hours and documents so our team can approve the shop.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/dashboard/setup">Finish setup</Link>
          </Button>
        </div>
      )}

      <TodayView
        shopId={shop.id}
        shopSlug={shop.status === "active" ? shop.slug : null}
        data={todayData}
        hours={todayHours}
        renderedAt={new Date().toISOString()}
      />
    </div>
  );
}
