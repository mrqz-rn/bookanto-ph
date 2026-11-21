// Content-Security-Policy for every page (set in middleware.ts).
//
// Pages rendered per request (DYNAMIC_ROUTES in lib/routes.ts) get a nonce
// plus 'strict-dynamic'. Pages served from the edge cache can't carry a
// per-request nonce, so they allow inline scripts but keep every other
// restriction.
//
// Allowed hosts are limited to Supabase, Google Maps, the open-source map
// services (lib/open-map.ts) and Cloudflare Turnstile. Sentry and PostHog
// should go through same-origin routes (Sentry tunnelRoute, a PostHog
// rewrite) so they need no entry here.

import { NOMINATIM_HOST, OPEN_MAP_TILE_HOST } from "@/lib/open-map";

const GOOGLE_MAPS = {
  script: ["https://maps.googleapis.com"],
  img: [
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://*.googleusercontent.com",
  ],
  connect: ["https://maps.googleapis.com", "https://*.googleapis.com"],
  font: ["https://fonts.gstatic.com"],
};
const TURNSTILE = "https://challenges.cloudflare.com";

type CspOptions = {
  /** Per-request nonce for dynamic pages; omit for cacheable pages. */
  nonce?: string;
  supabaseUrl: string;
  dev: boolean;
};

export function buildCsp({ nonce, supabaseUrl, dev }: CspOptions): string {
  const supabase = new URL(supabaseUrl);
  const supabaseRealtime = `${supabase.protocol === "https:" ? "wss" : "ws"}://${supabase.host}`;

  const scriptSrc = nonce
    ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]
    : ["'self'", "'unsafe-inline'"];
  scriptSrc.push(TURNSTILE, ...GOOGLE_MAPS.script);
  // React needs eval in development for better stack traces.
  if (dev) scriptSrc.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      supabase.origin,
      ...GOOGLE_MAPS.img,
      OPEN_MAP_TILE_HOST,
    ],
    "font-src": ["'self'", ...GOOGLE_MAPS.font],
    "connect-src": [
      "'self'",
      supabase.origin,
      supabaseRealtime,
      ...GOOGLE_MAPS.connect,
      // Open-source maps: OpenFreeMap tiles, fonts and icons; Nominatim place search.
      OPEN_MAP_TILE_HOST,
      NOMINATIM_HOST,
    ],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(
    ([name, sources]) => `${name} ${sources.join(" ")}`,
  );
  if (!dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
