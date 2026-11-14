import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Keep preview deploys and local builds out of search results.
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/dashboard", "/admin", "/book", "/api"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
