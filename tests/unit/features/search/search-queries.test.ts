import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SEARCH_SORT_OPTIONS, type SearchSortOption } from "@/features/search/constants";
import { searchShops } from "@/features/search/queries";
import { searchShopsSchema } from "@/features/search/schema";
import { db } from "@/lib/db";
import type { BookingType } from "@/lib/db/schema/enums";

describe("search feature", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchShopsSchema", () => {
    it("accepts valid search filters with defaults", () => {
      const parsed = searchShopsSchema.parse({});
      expect(parsed.q).toBe("");
      expect(parsed.sort).toBe("recommended");
      expect(parsed.openNow).toBe(false);
      expect(parsed.limit).toBe(24);
      expect(parsed.offset).toBe(0);
    });

    it("parses full search filter set correctly", () => {
      const input = {
        q: "fade haircut",
        category: "barbershop",
        city: "marikina",
        bookingType: "slot" as const,
        priceMin: 10000,
        priceMax: 50000,
        openNow: true,
        sort: "price_asc" as const,
        lat: 14.65,
        lng: 121.1,
        limit: 12,
        offset: 0,
      };

      const parsed = searchShopsSchema.parse(input);
      expect(parsed.q).toBe("fade haircut");
      expect(parsed.category).toBe("barbershop");
      expect(parsed.city).toBe("marikina");
      expect(parsed.bookingType).toBe("slot");
      expect(parsed.priceMin).toBe(10000);
      expect(parsed.priceMax).toBe(50000);
      expect(parsed.openNow).toBe(true);
      expect(parsed.sort).toBe("price_asc");
      expect(parsed.lat).toBe(14.65);
      expect(parsed.lng).toBe(121.1);
    });

    it("rejects coordinates outside the Philippines bounds", () => {
      expect(() =>
        searchShopsSchema.parse({
          lat: 51.5074, // London
          lng: -0.1278,
        }),
      ).toThrow();
    });

    it("rejects negative price values", () => {
      expect(() =>
        searchShopsSchema.parse({
          priceMin: -100,
        }),
      ).toThrow();
    });

    it("rejects invalid booking types or sorts", () => {
      expect(() =>
        searchShopsSchema.parse({
          bookingType: "invalid_type" as unknown as BookingType,
        }),
      ).toThrow();

      expect(() =>
        searchShopsSchema.parse({
          sort: "invalid_sort" as unknown as SearchSortOption,
        }),
      ).toThrow();
    });
  });

  describe("searchShops query", () => {
    it("executes search query returning matched shop cards and total count", async () => {
      const mockShopId = randomUUID();
      const mockRow = {
        id: mockShopId,
        slug: "kuya-jun-barbershop",
        name: "Kuya Jun Barbershop",
        ratingAvg: "4.9",
        ratingCount: 25,
        verified: true,
        cityName: "Marikina",
        barangayName: "Concepcion Uno",
        fromPriceCentavos: 15000,
        categoryName: "Barbershop",
        categoryIcon: "scissors",
        photoPath: "shops/barber.jpg",
        distanceM: null,
        lat: 14.6507,
        lng: 121.0963,
      };

      let queryCall = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                queryCall++;
                if (queryCall === 1) {
                  return Promise.resolve([{ count: 1 }]);
                }
                return {
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue([mockRow]),
                    }),
                  }),
                };
              }),
              $dynamic: vi.fn().mockImplementation(function (this: unknown) {
                return this;
              }),
            }),
          }),
        }),
      })) as unknown as typeof db.select);

      const result = await searchShops({
        q: "barber",
        city: "marikina",
        category: "barbershop",
        bookingType: "slot",
        priceMax: 30000,
        openNow: false,
        sort: "recommended",
        limit: 10,
        offset: 0,
      });

      expect(result.totalCount).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0]?.name).toBe("Kuya Jun Barbershop");
      expect(result.items[0]?.ratingAvg).toBe(4.9);
      expect(result.items[0]?.place).toBe("Concepcion Uno, Marikina");
      expect(result.items[0]?.lat).toBe(14.6507);
    });
  });

  describe("SEARCH_SORT_OPTIONS constant", () => {
    it("contains standard sort options", () => {
      const values = SEARCH_SORT_OPTIONS.map((o) => o.value);
      expect(values).toContain("recommended");
      expect(values).toContain("rating");
      expect(values).toContain("distance");
      expect(values).toContain("price_asc");
      expect(values).toContain("newest");
    });
  });
});
