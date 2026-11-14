import { publicEnv } from "@/lib/public-env";

export const SITE_NAME = "BooKanto";
export const SITE_TAGLINE = "Book services sa kanto mo";
export const SITE_DESCRIPTION =
  "Find and book trusted local services near you: barbershops, salons, aircon cleaning, auto repair and more.";

/** An absolute URL on this site, for canonical links, sitemaps and JSON-LD. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL).toString();
}
