import type { NextConfig } from "next";

// Static security headers for every response, assets included. The
// Content-Security-Policy is set per request in middleware.ts because
// dynamic pages need a fresh nonce.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  },
  // Older browsers ignore CSP frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Public shop photos from Supabase Storage.
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === "https:" ? "https" : "http",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
