import "server-only";

import { z } from "zod";

import { parseEnv, publicEnv } from "@/lib/public-env";

// The only place server code reads process.env. Validated when the server
// starts (instrumentation.ts), so a missing secret fails the deploy, not a
// customer's request. Add each new variable here and to .env.example.
const serverEnv = parseEnv(
  z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Supabase transaction pooler (port 6543) in deployed environments.
    DATABASE_URL: z.url(),
  }),
  process.env,
);

export const env = { ...serverEnv, ...publicEnv };
