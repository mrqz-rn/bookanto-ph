import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

let client: SupabaseClient | null = null;

/**
 * Secret-key client for the adapters in lib/ (today: private document storage).
 * It bypasses RLS, so call it only after the app has checked permissions with
 * assertCan, and never for anything a user's own session should do.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!env.SUPABASE_SECRET_KEY) {
    console.error("SUPABASE_SECRET_KEY is not set; private storage is unavailable.");
    throw new AppError("INTERNAL", "Uploads aren't available right now. Please try again later.");
  }
  client ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
