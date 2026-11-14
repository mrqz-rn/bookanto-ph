"use server";

import type { ShopCardData } from "@/components/shared/shop-card";
import { parseInput, runAction, type ActionResult } from "@/lib/errors";
import { coarsen } from "@/lib/geo";

import { getPopularShopsNear } from "./queries";
import { nearbyShopsInput } from "./schema";

/**
 * "Popular near you" on the home page. Public, like all browsing (shop:read is
 * open to guests), so there is no session or permission step. Coordinates are
 * coarsened to about 1 km before the query: nearby customers share a cached
 * result, and no exact location reaches the database.
 */
export async function findPopularShopsNear(input: unknown): Promise<ActionResult<ShopCardData[]>> {
  return runAction(async () => {
    const { lat, lng } = parseInput(nearbyShopsInput, input);
    return getPopularShopsNear(coarsen(lat), coarsen(lng));
  });
}
