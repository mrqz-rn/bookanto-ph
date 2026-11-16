import { z } from "zod";

/** Parses environment variables, naming every missing or invalid one (never its value). */
export function parseEnv<S extends z.ZodType>(schema: S, values: unknown): z.output<S> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}\nSee .env.example.`);
  }
  return result.data;
}

// On Vercel preview deploys, fall back to the deploy's own URL.
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;

/**
 * Variables that are safe in the browser. Each is read by its full name so
 * Next.js can inline it into client bundles. Server secrets live in lib/env.ts.
 */
export const publicEnv = parseEnv(
  z.object({
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
    // Street maps on /search. Without it the map view shows a simple drawn map.
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: z.string().optional(),
  }),
  {
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : undefined),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
  },
);
