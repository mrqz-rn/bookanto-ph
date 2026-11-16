// Shared by the server queries and the browser components, so it stays free of
// server-only imports and of Zod.

/** "Popular near you" looks this far out. */
export const NEARBY_RADIUS_M = 5000;

export const SEARCH_SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest rated" },
  { value: "distance", label: "Nearest" },
  { value: "price_asc", label: "Lowest price" },
  { value: "newest", label: "Newest" },
] as const;

export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number]["value"];

export const DEFAULT_SEARCH_LIMIT = 24;

/** Distances a nearby search can be limited to, in kilometers. */
export const SEARCH_RADII_KM = [1, 3, 5, 10, 25] as const;
export const DEFAULT_RADIUS_KM = 5;

/** Minimum ratings offered as a filter. */
export const RATING_FILTERS = [4, 4.5] as const;

/** Searches one visitor may run per minute (plan: rate limits). */
export const SEARCHES_PER_MINUTE = 60;
