// Browser-safe PWA constants and storage keys

export const BOOKANTO_TODAY_CACHE_PREFIX = "bookanto_today_cache_";
export const BOOKANTO_LAST_SHOP_ID_KEY = "bookanto_last_shop_id";
export const PWA_DISMISSED_KEY = "bookanto_pwa_dismissed_until";

export type PwaInstallState = "unsupported" | "can-install" | "installed" | "dismissed";

export type AppPlatform = "android" | "ios" | "pwa" | "web" | "native";

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export const PWA_BENEFITS = [
  {
    title: "1-Tap Home Screen Access",
    description: "Launch BooKanto directly from your home screen without typing web addresses.",
    icon: "zap",
  },
  {
    title: "Offline Schedule & Client Contacts",
    description:
      "View today's appointments and call clients even during signal drops or brownouts.",
    icon: "wifi-off",
  },
  {
    title: "Instant Booking Alerts",
    description: "Get new booking requests the moment they arrive, even with the app closed.",
    icon: "bell",
  },
  {
    title: "Data-Saver & Fast",
    description: "Consumes less than 2 MB and caches pages locally for Philippine mobile networks.",
    icon: "smartphone",
  },
] as const;

export const NATIVE_APP_CONFIG = {
  appId: "ph.bookanto.app",
  appName: "BooKanto",
  playStoreUrl: "https://play.google.com/store/apps/details?id=ph.bookanto.app",
  appStoreUrl: "https://apps.apple.com/app/bookanto/id6400000000",
  customScheme: "bookanto://",
} as const;
