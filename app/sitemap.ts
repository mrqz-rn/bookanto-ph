import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/features/search/queries";
import { absoluteUrl } from "@/lib/seo";

// Rebuilt daily. Must be a literal. One file holds up to 50,000 URLs, far more
// than the pilot needs; split it with generateSitemaps() past that.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { shops, listings } = await getSitemapEntries();
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/explore"), changeFrequency: "daily", priority: 0.9 },
    ...listings.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...shops.map((shop) => ({
      url: absoluteUrl(`/shop/${shop.slug}`),
      lastModified: shop.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/register-shop"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
