import Link from "next/link";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  Scissors,
  Settings,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getShopServices, getShopPackages, getShopMemberships } from "@/features/services/queries";
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
          className="text-navy-950 mt-6 bg-orange-600 font-bold hover:bg-orange-500"
        >
          <Link href="/dashboard/setup">Start 5-Step Shop Onboarding →</Link>
        </Button>
      </div>
    );
  }

  // Fetch metrics for this shop
  const services = await getShopServices(shop.id);
  const packages = await getShopPackages(shop.id);
  const memberships = await getShopMemberships(shop.id);

  return (
    <div className="space-y-8">
      {/* Status Banner */}
      {shop.status === "draft" && (
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
          <Button asChild size="sm" className="shrink-0 bg-navy-900 text-xs text-white">
            <Link href="/dashboard/setup">Continue Setup →</Link>
          </Button>
        </div>
      )}

      {shop.status === "pending" && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-5 text-blue-900">
          <Clock className="mt-0.5 size-6 shrink-0 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold">Application Under Review</h3>
            <p className="mt-0.5 text-xs text-blue-800">
              Your business verification documents have been received! Our review team evaluates
              documents within 24 to 48 hours. In the meantime, you can configure your services,
              add-ons, and pricing.
            </p>
          </div>
        </div>
      )}

      {shop.status === "active" && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 text-emerald-600" />
            <div>
              <h3 className="text-sm font-semibold">Your Shop is Live on BooKanto!</h3>
              <p className="text-xs text-emerald-800">
                Customers nearby can find you and book appointments online.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-emerald-300 text-xs text-emerald-900"
          >
            <Link href={`/shop/${shop.slug}`} target="_blank">
              View Public Page <ExternalLink className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Scissors className="size-5" />
          </div>
          <p className="mt-3 text-xs font-semibold text-neutral-500">Active Services</p>
          <p className="mt-1 font-display text-2xl font-bold text-neutral-900">{services.length}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Package className="size-5" />
          </div>
          <p className="mt-3 text-xs font-semibold text-neutral-500">Bundled Packages</p>
          <p className="mt-1 font-display text-2xl font-bold text-neutral-900">{packages.length}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Award className="size-5" />
          </div>
          <p className="mt-3 text-xs font-semibold text-neutral-500">Memberships & Passes</p>
          <p className="mt-1 font-display text-2xl font-bold text-neutral-900">
            {memberships.length}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Store className="size-5" />
          </div>
          <p className="mt-3 text-xs font-semibold text-neutral-500">Shop Status</p>
          <p className="mt-1 font-display text-xl font-bold text-neutral-900 capitalize">
            {shop.status}
          </p>
        </div>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Services & Pricing Quick Action */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-orange-700 uppercase">
              <Scissors className="size-4" />
              <span>Service Management</span>
            </div>
            <h3 className="mt-2 font-display text-xl text-neutral-900">
              Services, Add-ons & Pricing
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600">
              Configure your service catalog with fixed, starts-at, or quote prices, durations,
              capacity limits, add-on upgrades, and bundled packages.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              className="text-navy-950 bg-orange-600 text-xs font-bold hover:bg-orange-500"
            >
              <Link href="/dashboard/services">Manage Services Menu →</Link>
            </Button>
          </div>
        </div>

        {/* Shop Details & Location Quick Action */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-navy-900 uppercase">
              <Settings className="size-4" />
              <span>Shop Profile & Onboarding</span>
            </div>
            <h3 className="mt-2 font-display text-xl text-neutral-900">Location, Hours & Photos</h3>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600">
              Update your exact map pin, weekly opening hours, storefront showcase photos, and
              verification credentials.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs text-navy-900">
              <Link href="/dashboard/setup">Edit 5-Step Shop Details →</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
