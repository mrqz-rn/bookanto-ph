// The /search URL: reading it into a search and writing a search back into
// it. Browser-safe and pure, so links, the filter panel and the page agree on
// one format. Malformed values are dropped instead of failing the page.

import type { BookingType } from "@/lib/db/schema/enums";
import { coarsen, isInPhilippines } from "@/lib/geo";

import {
  DEFAULT_RADIUS_KM,
  DEFAULT_SEARCH_LIMIT,
  RATING_FILTERS,
  SEARCH_RADII_KM,
  SEARCH_SORT_OPTIONS,
  type SearchSortOption,
} from "./constants";
import { MAX_QUERY_LENGTH } from "./text";

const BOOKING_TYPE_VALUES: readonly BookingType[] = ["slot", "home", "quote", "queue"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_PAGE = 50;

export type SearchState = {
  q: string;
  category: string | null;
  city: string | null;
  barangay: string | null;
  bookingType: BookingType | null;
  /** Bounds on a shop's starting price, in centavos. */
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
  verified: boolean;
  openNow: boolean;
  sort: SearchSortOption;
  /** The customer's place, rounded to about 1 km. */
  near: { lat: number; lng: number } | null;
  radiusKm: number;
  page: number;
  view: "grid" | "map";
};

export const EMPTY_SEARCH: SearchState = {
  q: "",
  category: null,
  city: null,
  barangay: null,
  bookingType: null,
  priceMin: null,
  priceMax: null,
  minRating: null,
  verified: false,
  openNow: false,
  sort: "recommended",
  near: null,
  radiusKm: DEFAULT_RADIUS_KM,
  page: 1,
  view: "grid",
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
const slugOrNull = (value: string) => (value.length <= 80 && SLUG.test(value) ? value : null);
const centavosOrNull = (value: string) => (/^\d{1,9}$/.test(value) ? Number(value) : null);
const yes = (value: string) => value === "true" || value === "1";

export function parseSearchParams(params: RawSearchParams): SearchState {
  const lat = Number(first(params.lat));
  const lng = Number(first(params.lng));
  const hasPoint =
    first(params.lat) !== "" &&
    first(params.lng) !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    isInPhilippines(lat, lng);
  const near = hasPoint ? { lat: coarsen(lat), lng: coarsen(lng) } : null;

  let priceMin = centavosOrNull(first(params.price_min));
  let priceMax = centavosOrNull(first(params.price_max));
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  const sort =
    SEARCH_SORT_OPTIONS.find((option) => option.value === first(params.sort))?.value ??
    "recommended";
  const radius = Number(first(params.radius));
  const rating = Number(first(params.rating));
  const page = Number(first(params.page));
  const type = first(params.type);
  const city = slugOrNull(first(params.city));

  return {
    q: first(params.q).slice(0, MAX_QUERY_LENGTH),
    category: slugOrNull(first(params.category)),
    city,
    barangay: city ? slugOrNull(first(params.barangay)) : null,
    bookingType: BOOKING_TYPE_VALUES.find((value) => value === type) ?? null,
    priceMin,
    priceMax,
    minRating: RATING_FILTERS.find((value) => value === rating) ?? null,
    verified: yes(first(params.verified)),
    openNow: yes(first(params.open_now)),
    // Sorting by distance needs a place to measure from.
    sort: sort === "distance" && !near ? "recommended" : sort,
    near,
    radiusKm: SEARCH_RADII_KM.find((km) => km === radius) ?? DEFAULT_RADIUS_KM,
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
    view: first(params.view) === "map" ? "map" : "grid",
  };
}

/** The query string for a search, leaving out every default. */
export function searchQueryString(state: Partial<SearchState>): string {
  const s = { ...EMPTY_SEARCH, ...state };
  const params = new URLSearchParams();
  if (s.q) params.set("q", s.q);
  if (s.category) params.set("category", s.category);
  if (s.city) params.set("city", s.city);
  if (s.city && s.barangay) params.set("barangay", s.barangay);
  if (s.bookingType) params.set("type", s.bookingType);
  if (s.priceMin !== null) params.set("price_min", String(s.priceMin));
  if (s.priceMax !== null) params.set("price_max", String(s.priceMax));
  if (s.minRating !== null) params.set("rating", String(s.minRating));
  if (s.verified) params.set("verified", "true");
  if (s.openNow) params.set("open_now", "true");
  if (s.near) {
    params.set("lat", String(s.near.lat));
    params.set("lng", String(s.near.lng));
    if (s.radiusKm !== DEFAULT_RADIUS_KM) params.set("radius", String(s.radiusKm));
  }
  if (s.sort !== "recommended" && (s.sort !== "distance" || s.near)) params.set("sort", s.sort);
  if (s.page > 1) params.set("page", String(s.page));
  if (s.view === "map") params.set("view", "map");
  return params.toString();
}

export function searchHref(state: Partial<SearchState>): string {
  const query = searchQueryString(state);
  return query ? `/search?${query}` : "/search";
}

/** The same search with some things changed. Any change except the page goes back to page 1. */
export function searchHrefWith(current: SearchState, changes: Partial<SearchState>): string {
  return searchHref({ ...current, page: 1, ...changes });
}

/** The values searchShops() takes, for one page of results. */
export function toSearchInput(state: SearchState, pageSize = DEFAULT_SEARCH_LIMIT) {
  return {
    q: state.q,
    category: state.category ?? undefined,
    city: state.city ?? undefined,
    barangay: state.barangay ?? undefined,
    bookingType: state.bookingType ?? undefined,
    priceMin: state.priceMin ?? undefined,
    priceMax: state.priceMax ?? undefined,
    minRating: state.minRating ?? undefined,
    verified: state.verified,
    openNow: state.openNow,
    sort: state.sort,
    lat: state.near?.lat,
    lng: state.near?.lng,
    radiusKm: state.radiusKm,
    limit: pageSize,
    offset: (state.page - 1) * pageSize,
  };
}

/** Filters narrowing the results, not counting the search text and sort. */
export function countActiveFilters(state: SearchState): number {
  return [
    state.category,
    state.city,
    state.bookingType,
    state.priceMin !== null || state.priceMax !== null,
    state.minRating !== null,
    state.verified,
    state.openNow,
    state.near,
  ].filter(Boolean).length;
}
