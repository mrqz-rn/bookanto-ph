import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

// Shop and city-and-category pages join this as they ship, split by type
// with generateSitemaps() and rebuilt nightly.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 }];
}
