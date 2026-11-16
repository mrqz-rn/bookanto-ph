import { ChevronLeft, ChevronRight, LayoutGrid, Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { SearchFilters } from "@/features/search/components/search-filters";
import { ShopMapView } from "@/features/search/components/shop-map-view";
import { DEFAULT_SEARCH_LIMIT, SEARCHES_PER_MINUTE } from "@/features/search/constants";
import { listingHeading } from "@/features/search/labels";
import {
  parseSearchParams,
  searchHref,
  searchHrefWith,
  toSearchInput,
  type RawSearchParams,
  type SearchState,
} from "@/features/search/params";
import {
  getActiveCities,
  getCategoryOptions,
  getRecommendedShops,
  searchShops,
  type CategoryOption,
  type CityOption,
} from "@/features/search/queries";
import { getCurrentUser } from "@/lib/auth";
import { isStoreAccount } from "@/lib/home";
import { hitRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

// Rendered per request (it's in DYNAMIC_ROUTES, so it gets a nonce-based CSP).
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<RawSearchParams> };

/** The clean category or city page this search duplicates, if any. */
function canonicalPath(state: SearchState): string | null {
  const narrowed =
    state.q ||
    state.barangay ||
    state.bookingType ||
    state.priceMin !== null ||
    state.priceMax !== null ||
    state.minRating !== null ||
    state.verified ||
    state.openNow ||
    state.near;
  if (narrowed) return null;
  if (state.category && state.city) return `/${state.city}/${state.category}`;
  if (state.category) return `/c/${state.category}`;
  if (state.city) return `/${state.city}`;
  return null;
}

function heading(state: SearchState, categories: CategoryOption[], cities: CityOption[]): string {
  if (state.q) return `Results for “${state.q}”`;
  const category = categories.find((option) => option.slug === state.category);
  const city = cities.find((option) => option.slug === state.city);
  if (category) return listingHeading(category.name, city?.name ?? null);
  if (city) return `Shops in ${city.name}`;
  return state.near ? "Shops near you" : "Find a shop";
}

/** "Marikina" when the place is a city center, otherwise "your location". */
function nearLabel(state: SearchState, cities: CityOption[]): string | null {
  if (!state.near) return null;
  const city = cities.find(
    (option) =>
      Math.abs(option.lat - state.near!.lat) < 0.006 &&
      Math.abs(option.lng - state.near!.lng) < 0.006,
  );
  return city?.name ?? "your location";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseSearchParams(await searchParams);
  const canonical = canonicalPath(state);
  return {
    title: state.q ? `Search: ${state.q}` : "Search shops",
    description: "Find and book barbershops, salons, aircon cleaning and more near you.",
    // Search results stay out of Google; the links on them are still followed.
    robots: { index: false, follow: true },
    ...(canonical && { alternates: { canonical } }),
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const state = parseSearchParams(await searchParams);

  // Store accounts manage their shop from the dashboard, not the marketplace.
  const user = await getCurrentUser();
  if (user && isStoreAccount(user)) redirect("/dashboard");

  const ip = await getClientIp();
  if (ip && !(await hitRateLimit(`search:${ip}`, SEARCHES_PER_MINUTE, 60))) {
    return <TooManySearches />;
  }

  const [categories, cities, results] = await Promise.all([
    getCategoryOptions(),
    getActiveCities(),
    searchShops(toSearchInput(state, DEFAULT_SEARCH_LIMIT)),
  ]);
  const recommendations = results.totalCount === 0 ? await getRecommendedShops({ limit: 4 }) : [];
  const pageCount = Math.max(1, Math.ceil(results.totalCount / DEFAULT_SEARCH_LIMIT));
  const firstShown = (state.page - 1) * DEFAULT_SEARCH_LIMIT + 1;
  const lastShown = firstShown + results.items.length - 1;

  return (
    <main id="main" className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">{heading(state, categories, cities)}</h1>
        <p className="text-slate-600" role="status">
          {results.totalCount === 0
            ? "No shops match yet."
            : results.totalCount === 1
              ? "1 shop"
              : `${results.totalCount} shops`}
        </p>
      </div>

      <SearchFilters
        key={searchHref(state)}
        state={state}
        categories={categories}
        cities={cities}
        nearLabel={nearLabel(state, cities)}
      />

      {results.totalCount > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Showing {firstShown}–{lastShown} of {results.totalCount}
          </p>
          <nav aria-label="Results view" className="inline-flex rounded-lg border bg-muted p-1">
            <ViewLink
              href={searchHrefWith(state, { view: "grid", page: state.page })}
              current={state.view === "grid"}
            >
              <LayoutGrid aria-hidden className="size-4" />
              List
            </ViewLink>
            <ViewLink
              href={searchHrefWith(state, { view: "map", page: state.page })}
              current={state.view === "map"}
            >
              <MapIcon aria-hidden className="size-4" />
              Map
            </ViewLink>
          </nav>
        </div>
      )}

      {results.totalCount === 0 ? (
        <section className="flex flex-col gap-4 rounded-xl border border-dashed bg-card p-6 text-center">
          <h2 className="font-display text-xl font-bold">Walang nahanap. Nothing matched.</h2>
          <p className="text-slate-600">
            Try fewer words, check the spelling, turn off a filter or search a wider area.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/search">Clear search</Link>
            </Button>
            <Button asChild>
              <Link href="/explore">Browse categories</Link>
            </Button>
          </div>
          {recommendations.length > 0 && (
            <div className="mt-4 border-t pt-6 text-left">
              <h3 className="mb-4 font-display text-lg font-bold">Popular on BooKanto</h3>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {recommendations.map((shop) => (
                  <li key={shop.id}>
                    <ShopCard shop={shop} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : state.view === "map" ? (
        <ShopMapView shops={results.items} center={state.near} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.items.map((shop) => (
            <li key={shop.id}>
              <ShopCard shop={shop} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 pt-2">
          {state.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={searchHrefWith(state, { page: state.page - 1 })} rel="prev">
                <ChevronLeft aria-hidden />
                Previous
              </Link>
            </Button>
          ) : null}
          <span className="text-sm text-slate-600">
            Page {state.page} of {pageCount}
          </span>
          {state.page < pageCount ? (
            <Button asChild variant="outline">
              <Link href={searchHrefWith(state, { page: state.page + 1 })} rel="next">
                Next
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          ) : null}
        </nav>
      )}
    </main>
  );
}

function ViewLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${
        current ? "bg-white text-navy-900 shadow-xs" : "text-slate-600 hover:text-navy-900"
      }`}
    >
      {children}
    </Link>
  );
}

function TooManySearches() {
  return (
    <main id="main" className="mx-auto flex max-w-xl flex-col gap-3 px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Too many searches</h1>
      <p className="text-slate-600">
        You&apos;ve searched a lot in the last minute. Please wait a moment, then try again.
      </p>
      <Button asChild className="w-fit">
        <Link href="/explore">Browse shops instead</Link>
      </Button>
    </main>
  );
}
