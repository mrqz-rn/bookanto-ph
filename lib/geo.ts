// A box around the Philippines, for rejecting coordinates we can't serve.
export const PH_BOUNDS = { minLat: 4.2, maxLat: 21.5, minLng: 116, maxLng: 127 } as const;

export function isInPhilippines(lat: number, lng: number): boolean {
  return (
    lat >= PH_BOUNDS.minLat &&
    lat <= PH_BOUNDS.maxLat &&
    lng >= PH_BOUNDS.minLng &&
    lng <= PH_BOUNDS.maxLng
  );
}

/**
 * Rounds a coordinate to 2 decimals, about 1 km. Enough to find nearby shops,
 * and we never need a person's exact location for it.
 */
export function coarsen(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "350 m", "1.2 km", "5 km", "12 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${km < 10 ? Number(km.toFixed(1)) : Math.round(km)} km`;
}
