import { afterEach, describe, expect, it, vi } from "vitest";

import {
  nominatimSearchUrl,
  parseNominatimResults,
  searchPlaces,
  streetViewUrl,
} from "@/lib/open-map";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("nominatimSearchUrl", () => {
  it("searches the Philippines only and trims the query", () => {
    const url = new URL(nominatimSearchUrl("  J.P. Rizal St, Marikina "));
    expect(url.origin).toBe("https://nominatim.openstreetmap.org");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("J.P. Rizal St, Marikina");
    expect(url.searchParams.get("countrycodes")).toBe("ph");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("limit")).toBe("5");
  });
});

describe("parseNominatimResults", () => {
  it("keeps well-formed results as numbers", () => {
    expect(
      parseNominatimResults([
        { display_name: "Concepcion Uno, Marikina", lat: "14.6507", lon: "121.1029" },
      ]),
    ).toEqual([{ label: "Concepcion Uno, Marikina", lat: 14.6507, lng: 121.1029 }]);
  });

  it("drops malformed entries and non-array input", () => {
    expect(
      parseNominatimResults([
        null,
        { display_name: "No coordinates" },
        { display_name: "Bad", lat: "north", lon: "121" },
        { lat: "14.6", lon: "121.1" },
      ]),
    ).toEqual([]);
    expect(parseNominatimResults({ error: "rate limited" })).toEqual([]);
  });
});

describe("searchPlaces", () => {
  it("doesn't call the service for very short queries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchPlaces("ab")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on an HTTP error so the UI can say search is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    await expect(searchPlaces("Marikina")).rejects.toThrow("429");
  });
});

describe("streetViewUrl", () => {
  it("opens Google Street View at the pin without an API key", () => {
    const url = new URL(streetViewUrl({ lat: 14.6507, lng: 121.1029 }));
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("map_action")).toBe("pano");
    expect(url.searchParams.get("viewpoint")).toBe("14.6507,121.1029");
    expect(url.searchParams.has("key")).toBe(false);
  });
});
