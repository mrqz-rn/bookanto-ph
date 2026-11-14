import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

// Shop and city-and-category pages join this as they ship, split by type
// with generateSitemaps() and rebuilt nightly.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/explore"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
