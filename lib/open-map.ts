// Open-source maps: MapLibre GL draws OpenFreeMap's OpenStreetMap tiles
// (free, no key, commercial use allowed) and Nominatim finds places.
// Browser-safe: no secrets, no Zod. Hosts here must stay in lib/csp.ts.
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/):
// at most 1 request per second and no search-as-you-type, so search runs only
// when the person submits. Results are © OpenStreetMap contributors, which the
// map's attribution already shows.

export const OPEN_MAP_TILE_HOST = "https://tiles.openfreemap.org";
export const OPEN_MAP_STYLE_URL = `${OPEN_MAP_TILE_HOST}/styles/liberty`;
export const NOMINATIM_HOST = "https://nominatim.openstreetmap.org";

export type PlaceResult = { label: string; lat: number; lng: number };

/** Search URL for places in the Philippines. */
export function nominatimSearchUrl(query: string, limit = 5): string {
  const params = new URLSearchParams({
    q: query.trim(),
    format: "jsonv2",
    countrycodes: "ph",
    limit: String(limit),
    "accept-language": "en",
  });
  return `${NOMINATIM_HOST}/search?${params}`;
}

/** Keeps only well-formed results from Nominatim's JSON. */
export function parseNominatimResults(data: unknown): PlaceResult[] {
  if (!Array.isArray(data)) return [];
  const results: PlaceResult[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const { display_name: label, lat, lon } = item as Record<string, unknown>;
    const latNum = typeof lat === "string" ? Number(lat) : NaN;
    const lngNum = typeof lon === "string" ? Number(lon) : NaN;
    if (typeof label !== "string" || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) continue;
    results.push({ label, lat: latNum, lng: lngNum });
  }
  return results;
}

/** Finds places in the Philippines. Throws on network or HTTP errors. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  if (query.trim().length < 3) return [];
  const response = await fetch(nominatimSearchUrl(query), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Place search failed (${response.status})`);
  return parseNominatimResults(await response.json());
}

/** A Google Maps link that opens Street View at a point. Needs no API key. */
export function streetViewUrl(point: { lat: number; lng: number }): string {
  const params = new URLSearchParams({
    api: "1",
    map_action: "pano",
    viewpoint: `${point.lat},${point.lng}`,
  });
  return `https://www.google.com/maps/@?${params}`;
}
