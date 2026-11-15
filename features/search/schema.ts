import { z } from "zod";

import { BOOKING_TYPES } from "@/lib/db/schema/enums";
import { PH_BOUNDS } from "@/lib/geo";

export const nearbyShopsInput = z.strictObject({
  lat: z.number().min(PH_BOUNDS.minLat).max(PH_BOUNDS.maxLat),
  lng: z.number().min(PH_BOUNDS.minLng).max(PH_BOUNDS.maxLng),
});

export const SEARCH_SORT_OPTIONS = [
  "recommended",
  "rating",
  "distance",
  "price_asc",
  "newest",
] as const;
export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number];

export const searchShopsSchema = z.strictObject({
  q: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(50).optional(),
  city: z.string().trim().max(50).optional(),
  bookingType: z.enum(BOOKING_TYPES).optional(),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
  openNow: z.boolean().optional().default(false),
  sort: z.enum(SEARCH_SORT_OPTIONS).default("recommended"),
  lat: z.number().min(PH_BOUNDS.minLat).max(PH_BOUNDS.maxLat).optional(),
  lng: z.number().min(PH_BOUNDS.minLng).max(PH_BOUNDS.maxLng).optional(),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
});

export type SearchShopsInput = z.infer<typeof searchShopsSchema>;
