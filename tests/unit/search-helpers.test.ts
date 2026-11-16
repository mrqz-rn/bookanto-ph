import { describe, expect, it } from "vitest";

import {
  listingDescription,
  listingFaqs,
  listingHeading,
  listingTitle,
  pluralCategory,
  priceRangeLabel,
} from "@/features/search/labels";
import {
  countActiveFilters,
  EMPTY_SEARCH,
  parseSearchParams,
  searchHref,
  searchHrefWith,
  toSearchInput,
} from "@/features/search/params";
import { normalizeText, parseQuery } from "@/features/search/text";

describe("parseQuery", () => {
  it("normalizes case, accents and punctuation", () => {
    expect(normalizeText("  Santo Niño,  BARBER!! ")).toBe("santo nino barber");
  });

  it("maps Filipino and shorthand words to the words shops use", () => {
    expect(parseQuery("gupit")?.tokens).toEqual(["haircut"]);
    expect(parseQuery("AC")?.tokens).toEqual(["aircon"]);
    expect(parseQuery("air con sa Marikina")?.tokens).toEqual(["aircon", "marikina"]);
    expect(parseQuery("masahe")?.tokens).toEqual(["massage"]);
    expect(parseQuery("talyer")?.tokens).toEqual(["auto", "repair"]);
  });

  it("drops filler words and repeats", () => {
    expect(parseQuery("barber near me")?.tokens).toEqual(["barber"]);
    expect(parseQuery("haircut haircut")?.tokens).toEqual(["haircut"]);
  });

  it("returns null when nothing is left to search", () => {
    expect(parseQuery("")).toBeNull();
    expect(parseQuery("  ?! ")).toBeNull();
    expect(parseQuery("near me")).toBeNull();
  });

  it("caps the number of words", () => {
    expect(parseQuery("a1 b2 c3 d4 e5 f6 g7 h8")?.tokens).toHaveLength(6);
  });
});

describe("search URL", () => {
  it("reads a full search", () => {
    const state = parseSearchParams({
      q: "fade",
      category: "barbershop",
      city: "marikina",
      barangay: "malanday",
      type: "home",
      price_min: "10000",
      price_max: "50000",
      rating: "4.5",
      verified: "true",
      open_now: "true",
      lat: "14.6507",
      lng: "121.1029",
      radius: "3",
      sort: "distance",
      page: "2",
      view: "map",
    });
    expect(state).toEqual({
      q: "fade",
      category: "barbershop",
      city: "marikina",
      barangay: "malanday",
      bookingType: "home",
      priceMin: 10_000,
      priceMax: 50_000,
      minRating: 4.5,
      verified: true,
      openNow: true,
      sort: "distance",
      near: { lat: 14.65, lng: 121.1 },
      radiusKm: 3,
      page: 2,
      view: "map",
    });
  });

  it("ignores malformed or unsafe values instead of failing", () => {
    const state = parseSearchParams({
      category: "../etc",
      city: "Marikina City",
      barangay: "malanday",
      type: "teleport",
      rating: "3",
      radius: "999",
      page: "-1",
      lat: "1.35",
      lng: "103.8", // Singapore
      sort: "distance",
    });
    expect(state).toEqual({ ...EMPTY_SEARCH });
  });

  it("swaps a reversed price range", () => {
    const state = parseSearchParams({ price_min: "90000", price_max: "10000" });
    expect([state.priceMin, state.priceMax]).toEqual([10_000, 90_000]);
  });

  it("writes only what differs from the defaults", () => {
    expect(searchHref({})).toBe("/search");
    expect(searchHref({ q: "aircon", openNow: true })).toBe("/search?q=aircon&open_now=true");
  });

  it("survives a round trip", () => {
    const state = parseSearchParams({
      q: "nails",
      city: "pasig",
      rating: "4",
      lat: "14.57",
      lng: "121.06",
      radius: "10",
      sort: "distance",
      page: "3",
    });
    const href = searchHref(state);
    const again = parseSearchParams(Object.fromEntries(new URL(href, "https://x.ph").searchParams));
    expect(again).toEqual(state);
  });

  it("goes back to page 1 when a filter changes", () => {
    const state = { ...EMPTY_SEARCH, q: "spa", page: 4 };
    expect(searchHrefWith(state, { verified: true })).toBe("/search?q=spa&verified=true");
    expect(searchHrefWith(state, { page: 5 })).toBe("/search?q=spa&page=5");
  });

  it("turns a page number into an offset", () => {
    expect(toSearchInput({ ...EMPTY_SEARCH, page: 3 }, 24)).toMatchObject({
      limit: 24,
      offset: 48,
    });
  });

  it("counts active filters", () => {
    expect(countActiveFilters(EMPTY_SEARCH)).toBe(0);
    expect(
      countActiveFilters({ ...EMPTY_SEARCH, q: "x", openNow: true, priceMin: 100, priceMax: 500 }),
    ).toBe(2);
  });
});

describe("listing wording", () => {
  it("pluralizes kinds of shops but not services", () => {
    expect(pluralCategory("Barbershop")).toBe("Barbershops");
    expect(pluralCategory("Hair salon")).toBe("Hair salons");
    expect(pluralCategory("Car wash")).toBe("Car washes");
    expect(pluralCategory("Laundry")).toBe("Laundry shops");
    expect(pluralCategory("Aircon cleaning")).toBe("Aircon cleaning");
    expect(pluralCategory("Massage and spa")).toBe("Massage and spa");
  });

  it("builds headings, titles and descriptions within search engine limits", () => {
    expect(listingHeading("Barbershop", "Marikina")).toBe("Barbershops in Marikina");
    expect(listingTitle("Barbershops in Marikina", 10_000)).toBe(
      "Barbershops in Marikina, from ₱100 | BooKanto",
    );
    const long = listingTitle("Aircon cleaning in Teachers Village East, Quezon City", 80_000);
    expect(long.length).toBeLessThanOrEqual(60);
    expect(listingDescription("Barbershops in Marikina", 12, 10_000).length).toBeLessThanOrEqual(
      155,
    );
  });

  it("formats price ranges", () => {
    expect(priceRangeLabel(null, null)).toBeNull();
    expect(priceRangeLabel(10_000, 10_000)).toBe("₱100");
    expect(priceRangeLabel(10_000, 150_000)).toBe("₱100 to ₱1,500");
  });

  it("writes FAQs from the page's real numbers", () => {
    const faqs = listingFaqs({
      category: "Barbershop",
      place: "Marikina",
      shopCount: 4,
      minCentavos: 12_000,
      maxCentavos: 25_000,
      homeService: false,
    });
    expect(faqs[0]).toEqual({
      question: "How much do barbershops in Marikina cost?",
      answer: expect.stringContaining("₱120 to ₱250"),
    });
    expect(faqs.map((faq) => faq.question)).not.toContain("Can I book a home service in Marikina?");
    expect(faqs.at(-1)?.answer).toContain("4 shops are listed");
  });
});
