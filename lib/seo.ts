import { publicEnv } from "@/lib/public-env";

export const SITE_NAME = "BooKanto";
export const SITE_TAGLINE = "Book services sa kanto mo";
export const SITE_DESCRIPTION =
  "Find and book trusted local services near you: barbershops, salons, aircon cleaning, auto repair and more.";

/**
 * City and category pages are indexed, and linked from other pages, only once
 * they have this many active shops, so Google never sees thin pages.
 */
export const MIN_SHOPS_FOR_LISTING_PAGE = 3;

/** Barangay-and-category pages need more shops than city pages (plan: 5 or more). */
export const MIN_SHOPS_FOR_BARANGAY_PAGE = 5;

/** An absolute URL on this site, for canonical links, sitemaps and JSON-LD. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL).toString();
}
