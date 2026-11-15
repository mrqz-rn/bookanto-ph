import Link from "next/link";
import { AlertCircle, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TodayView } from "@/features/bookings/components/today-view";
import { getTodayDashboardData } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";

export default async function DashboardPage() {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xs sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Store className="size-8" />
        </div>
        <h2 className="mt-4 font-display text-2xl text-neutral-900 sm:text-3xl">
          Welcome to BooKanto!
        </h2>
        <p className="mt-2 leading-relaxed text-neutral-600">
          List your shop in just 5 simple steps: basic info, map pin location, operating hours,
          photos, and verification documents.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-6 bg-orange-600 font-bold text-white hover:bg-orange-500"
        >
          <Link href="/dashboard/setup">Start 5-Step Shop Onboarding →</Link>
        </Button>
      </div>
    );
  }

  // If shop is draft, show onboarding alert banner
  const isDraft = shop.status === "draft";
  const todayData = await getTodayDashboardData(shop.id);

  return (
    <div className="space-y-6">
      {isDraft && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-6 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Shop Onboarding Incomplete (Draft)
              </h3>
              <p className="mt-0.5 text-xs text-amber-800">
                Finish setting up your location, operating hours, and verification documents so our
                team can approve your shop.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-neutral-900 text-xs text-white">
            <Link href="/dashboard/setup">Continue Setup →</Link>
          </Button>
        </div>
      )}

      <TodayView shopId={shop.id} data={todayData} />
    </div>
  );
}
