import { z } from "zod";

import { BOOKING_TYPES } from "@/lib/db/schema/enums";
import { PH_BOUNDS } from "@/lib/geo";

import { SEARCH_SORT_OPTIONS } from "./constants";
import { MAX_QUERY_LENGTH } from "./text";

export { SEARCH_SORT_OPTIONS, type SearchSortOption } from "./constants";

export const nearbyShopsInput = z.strictObject({
  lat: z.number().min(PH_BOUNDS.minLat).max(PH_BOUNDS.maxLat),
  lng: z.number().min(PH_BOUNDS.minLng).max(PH_BOUNDS.maxLng),
});

const slug = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const searchShopsSchema = z.strictObject({
  q: z.string().trim().max(MAX_QUERY_LENGTH).optional().default(""),
  category: slug.optional(),
  city: slug.optional(),
  /** Only used together with `city`. */
  barangay: slug.optional(),
  bookingType: z.enum(BOOKING_TYPES).optional(),
  /** Bounds on a shop's starting price, in centavos. */
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
  minRating: z.number().min(0).max(5).optional(),
  verified: z.boolean().optional().default(false),
  openNow: z.boolean().optional().default(false),
  sort: z.enum(SEARCH_SORT_OPTIONS.map((option) => option.value)).default("recommended"),
  /** The customer's place. With both set, results are limited to radiusKm. */
  lat: z.number().min(PH_BOUNDS.minLat).max(PH_BOUNDS.maxLat).optional(),
  lng: z.number().min(PH_BOUNDS.minLng).max(PH_BOUNDS.maxLng).optional(),
  radiusKm: z.number().min(1).max(50).default(5),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).max(5000).default(0),
});

export type SearchShopsInput = z.input<typeof searchShopsSchema>;
export type SearchShopsQuery = z.output<typeof searchShopsSchema>;
