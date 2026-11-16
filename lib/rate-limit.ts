import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Counts one hit for `key` and returns false once more than `limit` hits land
 * in the current `windowSeconds` window. Stored in Postgres (the
 * hit_rate_limit function, migration 0012_search), so it holds across
 * serverless instances.
 *
 * Fails open: if the check itself errors, the request goes through and the
 * error is logged, so a rate-limit outage never takes search down with it.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const result = await db.execute<{ allowed: boolean }>(
      sql`select public.hit_rate_limit(${key}, ${limit}::integer, ${windowSeconds}::integer) as allowed`,
    );
    // postgres-js returns the rows; PGlite (tests) returns { rows }.
    const rows = Array.isArray(result)
      ? result
      : (result as { rows: Array<{ allowed: boolean }> }).rows;
    return rows[0]?.allowed !== false;
  } catch (error) {
    console.error("Rate limit check failed; allowing the request.", error);
    return true;
  }
}
