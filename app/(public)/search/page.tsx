import { LayoutGrid, Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { SearchFilters } from "@/features/search/components/search-filters";
import { ShopMap } from "@/features/search/components/shop-map";
import {
  getActiveCities,
  getHomeCategories,
  getRecommendedShops,
  searchShops,
} from "@/features/search/queries";
import {
  SEARCH_SORT_OPTIONS,
  type SearchSortOption,
  type SearchShopsInput,
} from "@/features/search/schema";
import type { BookingType } from "@/lib/db/schema/enums";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Shops & Services | BooKanto",
  description:
    "Find and book local barbershops, salons, clinics, aircon cleaning, and more near you.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    type?: string;
    price_max?: string;
    open_now?: string;
    sort?: string;
    lat?: string;
    lng?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;

  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;
  const priceMax = params.price_max ? Number(params.price_max) : undefined;
  const openNow = params.open_now === "true";
  const view = params.view === "map" ? "map" : "grid";

  const searchInput: SearchShopsInput = {
    q: params.q ?? "",
    category: params.category || undefined,
    city: params.city || undefined,
    bookingType: (params.type as BookingType) || undefined,
    priceMax: !Number.isNaN(priceMax) ? priceMax : undefined,
    openNow,
    sort: SEARCH_SORT_OPTIONS.includes(params.sort as SearchSortOption)
      ? (params.sort as SearchSortOption)
      : "recommended",
    lat: !Number.isNaN(lat) ? lat : undefined,
    lng: !Number.isNaN(lng) ? lng : undefined,
    limit: 36,
    offset: 0,
  };

  const [categories, cities, searchResult, recommendations] = await Promise.all([
    getHomeCategories(),
    getActiveCities(),
    searchShops(searchInput),
    getRecommendedShops({ limit: 4 }),
  ]);

  const { items: shops, totalCount } = searchResult;

  // Build current query string preserving search params while toggling view
  const currentParams = new URLSearchParams();
  if (params.q) currentParams.set("q", params.q);
  if (params.category) currentParams.set("category", params.category);
  if (params.city) currentParams.set("city", params.city);
  if (params.type) currentParams.set("type", params.type);
  if (params.price_max) currentParams.set("price_max", params.price_max);
  if (params.open_now) currentParams.set("open_now", params.open_now);
  if (params.sort) currentParams.set("sort", params.sort);

  const gridHref = `?${new URLSearchParams({ ...Object.fromEntries(currentParams), view: "grid" }).toString()}`;
  const mapHref = `?${new URLSearchParams({ ...Object.fromEntries(currentParams), view: "map" }).toString()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Search Header */}
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          {params.q ? `Results for "${params.q}"` : "Explore Local Shops & Services"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {totalCount} {totalCount === 1 ? "shop found" : "shops found"}
          {params.city && ` in ${params.city}`}
          {params.category && ` for ${params.category}`}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="mb-6">
        <SearchFilters
          categories={categories}
          cities={cities}
          initialValues={{
            q: params.q,
            category: params.category,
            city: params.city,
            bookingType: params.type,
            priceMax,
            openNow,
            sort: searchInput.sort,
          }}
        />
      </div>

      {/* View Switcher Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">
          Showing {shops.length} of {totalCount}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-slate-100 p-0.5">
          <Link
            href={gridHref}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "grid"
                ? "bg-white text-navy-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Grid
          </Link>
          <Link
            href={mapHref}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "map"
                ? "bg-white text-navy-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapIcon className="size-3.5" />
            Map
          </Link>
        </div>
      </div>

      {/* Main Content: Grid or Map */}
      {shops.length > 0 ? (
        view === "map" ? (
          <ShopMap shops={shops} userLat={lat} userLng={lng} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="my-10 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-bold text-navy-900">
            Walang nahanap na shop sa iyong filter
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Try adjusting your search keywords, clearing your filters, or browsing other categories.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/search">Reset Filters</Link>
            </Button>
            <Button asChild>
              <Link href="/explore">Browse All Categories</Link>
            </Button>
          </div>

          {/* Recommendations fallback */}
          {recommendations.length > 0 && (
            <div className="mt-10 border-t border-border pt-8 text-left">
              <h3 className="mb-4 font-display text-lg font-bold text-navy-900">
                You might also be interested in:
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {recommendations.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
