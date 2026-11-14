// Tags on cached public data. Actions that change shops, categories or cities
// call revalidateTag() with these, so public pages update at once instead of
// waiting for the 10-minute rebuild.
export const CACHE_TAGS = {
  shops: "shops",
  categories: "categories",
  cities: "cities",
} as const;

/** How long cached public data may live (plan: rebuilt every 10 minutes). */
export const PUBLIC_REVALIDATE_SECONDS = 600;
