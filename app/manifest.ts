import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    lang: "en-PH",
    dir: "ltr",
    categories: ["lifestyle", "business", "utilities", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Explore Services",
        short_name: "Explore",
        description: "Find and book trusted local barbers, salons, and home services",
        url: "/explore",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Today's Schedule",
        short_name: "Schedule",
        description: "View today's bookings and appointments for your shop",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "My Bookings",
        short_name: "Bookings",
        description: "Track your booked appointments and chat with service providers",
        url: "/account/bookings",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      {
        src: "/opengraph-image.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "BooKanto - Book trusted local services in your neighborhood",
      },
      {
        src: "/opengraph-image.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "narrow",
        label: "BooKanto on mobile devices",
      },
    ],
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=ph.bookanto.app",
        id: "ph.bookanto.app",
      },
    ],
  };
}
