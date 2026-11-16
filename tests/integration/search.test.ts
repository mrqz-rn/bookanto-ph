import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { BookingStatus } from "@/lib/db/schema/enums";

vi.mock("@/lib/db", () => import("./pglite-db"));
// Cached reads would need the Next.js runtime; run them directly.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: () => {} }));

const { db } = await import("./pglite-db");
const schema = await import("@/lib/db/schema");
const {
  getCustomerRecommendations,
  getListingPage,
  getSimilarShops,
  getSitemapEntries,
  searchShops,
} = await import("@/features/search/queries");

// Wednesday, Dec 9, 2026, 10:30 in Manila. Not a holiday.
const WEDNESDAY_MORNING = new Date("2026-12-09T02:30:00Z");
// The same Wednesday at 12:30, inside the barbershop's lunch break.
const WEDNESDAY_LUNCH = new Date("2026-12-09T04:30:00Z");
// Christmas Day (a Friday), 10:30.
const CHRISTMAS_MORNING = new Date("2026-12-25T02:30:00Z");

const MARIKINA = { lat: 14.6507, lng: 121.1029 };

const ids = {
  barbershop: randomUUID(),
  fade: randomUUID(),
  aircon: randomUUID(),
  salon: randomUUID(),
  pasigBarber: randomUUID(),
  draft: randomUUID(),
};

beforeAll(async () => {
  const s = schema;
  const [owner] = await db.insert(s.users).values({ authId: "test-owner" }).returning();
  const [parent, sub, aircon, salon] = await db
    .insert(s.categories)
    .values([
      { slug: "barbershop", name: "Barbershop", sortOrder: 0 },
      { slug: "kids-haircut", name: "Kids haircut", sortOrder: 1 },
      { slug: "aircon-cleaning", name: "Aircon cleaning", sortOrder: 2 },
      { slug: "hair-salon", name: "Hair salon", sortOrder: 3 },
    ])
    .returning();
  await db.update(s.categories).set({ parentId: parent!.id }).where(eq(s.categories.id, sub!.id));

  const [marikina, pasig] = await db
    .insert(s.cities)
    .values([
      {
        slug: "marikina",
        name: "Marikina",
        province: "Metro Manila",
        isActive: true,
        center: MARIKINA,
      },
      {
        slug: "pasig",
        name: "Pasig",
        province: "Metro Manila",
        isActive: true,
        center: { lat: 14.5764, lng: 121.0851 },
      },
    ])
    .returning();
  const [concepcion, malanday] = await db
    .insert(s.barangays)
    .values([
      { cityId: marikina!.id, slug: "concepcion-uno", name: "Concepción Uno", isActive: true },
      { cityId: marikina!.id, slug: "malanday", name: "Malanday", isActive: true },
    ])
    .returning();

  const shop = (id: string, values: Partial<typeof s.shops.$inferInsert>) => ({
    id,
    ownerId: owner!.id,
    status: "active" as const,
    cityId: marikina!.id,
    ...values,
    slug: values.slug!,
    name: values.name!,
  });
  await db.insert(s.shops).values([
    shop(ids.barbershop, {
      slug: "kuya-juns-barbershop",
      name: "Kuya Jun's Barbershop",
      barangayId: concepcion!.id,
      location: { lat: 14.6498, lng: 121.1112 },
      ratingAvg: 4.8,
      ratingCount: 20,
      verifiedAt: new Date("2026-11-01T00:00:00Z"),
    }),
    shop(ids.fade, {
      slug: "fade-station",
      name: "Fade Station",
      barangayId: malanday!.id,
      location: { lat: 14.6553, lng: 121.0958 },
      ratingAvg: 4.2,
      ratingCount: 5,
    }),
    shop(ids.aircon, {
      slug: "lamig-aircon",
      name: "Lamig Aircon Services",
      barangayId: malanday!.id,
      location: { lat: 14.656, lng: 121.097 },
      ratingAvg: 4.5,
      ratingCount: 8,
      verifiedAt: new Date("2026-11-05T00:00:00Z"),
    }),
    shop(ids.salon, {
      slug: "ganda-salon",
      name: "Ganda Hair Studio",
      barangayId: concepcion!.id,
      location: { lat: 14.651, lng: 121.11 },
    }),
    shop(ids.pasigBarber, {
      slug: "kapitolyo-cuts",
      name: "Kapitolyo Cuts",
      cityId: pasig!.id,
      location: { lat: 14.5711, lng: 121.06 },
      ratingAvg: 3.9,
      ratingCount: 4,
    }),
    shop(ids.draft, { slug: "draft-barber", name: "Draft Barber", status: "draft" }),
  ]);

  await db.insert(s.shopCategories).values([
    { shopId: ids.barbershop, categoryId: parent!.id },
    { shopId: ids.fade, categoryId: sub!.id },
    { shopId: ids.aircon, categoryId: aircon!.id },
    { shopId: ids.salon, categoryId: salon!.id },
    { shopId: ids.pasigBarber, categoryId: parent!.id },
    { shopId: ids.draft, categoryId: parent!.id },
  ]);

  const service = (shopId: string, name: string, pesos: number | null, extra = {}) => ({
    shopId,
    name,
    priceType: pesos === null ? ("quote" as const) : ("fixed" as const),
    priceCentavos: pesos === null ? null : pesos * 100,
    durationMin: 30,
    ...extra,
  });
  await db
    .insert(s.services)
    .values([
      service(ids.barbershop, "Haircut", 150),
      service(ids.barbershop, "Haircut and shave", 220),
      service(ids.fade, "Skin fade", 200),
      service(ids.aircon, "Split-type aircon cleaning", 1500, { bookingType: "home" }),
      service(ids.aircon, "Freon recharge", null),
      service(ids.salon, "Rebond", 2500),
      service(ids.pasigBarber, "Haircut", 120),
      service(ids.draft, "Haircut", 100),
    ]);

  // Weekly hours: Wednesday is weekday 3, Friday 5.
  await db.insert(s.businessHours).values([
    {
      shopId: ids.barbershop,
      weekday: 3,
      opens: "09:00",
      closes: "19:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    { shopId: ids.barbershop, weekday: 5, opens: "09:00", closes: "19:00" },
    { shopId: ids.fade, weekday: 3, opens: "09:00", closes: "19:00" },
    { shopId: ids.aircon, weekday: 3, opens: "08:00", closes: "17:00" },
    { shopId: ids.aircon, weekday: 5, opens: "08:00", closes: "17:00" },
    { shopId: ids.salon, weekday: 3, opens: "13:00", closes: "20:00" },
    { shopId: ids.pasigBarber, weekday: 3, opens: "09:00", closes: "18:00" },
    { shopId: ids.pasigBarber, weekday: 5, opens: "09:00", closes: "18:00" },
  ]);
  // Fade Station is closed all of Dec 9 for a family event.
  await db.insert(s.closures).values({
    shopId: ids.fade,
    startsAt: new Date("2026-12-08T16:00:00Z"),
    endsAt: new Date("2026-12-09T16:00:00Z"),
    reason: "Family event",
  });
  // Christmas: the barbershop closes, the aircon shop opens 10:00 to 14:00.
  await db.insert(s.shopHolidayRules).values([
    { shopId: ids.barbershop, holidayKey: "christmas_day" },
    { shopId: ids.aircon, holidayKey: "christmas_day", opens: "10:00", closes: "14:00" },
  ]);
}, 60_000);

const slugs = (result: { items: Array<{ slug: string }> }) => result.items.map((shop) => shop.slug);

describe("searchShops against real Postgres", () => {
  it("lists active shops only", async () => {
    const result = await searchShops({}, WEDNESDAY_MORNING);
    expect(result.totalCount).toBe(5);
    expect(slugs(result)).not.toContain("draft-barber");
  });

  it("forgives typos in shop names, categories and services", async () => {
    expect(slugs(await searchShops({ q: "barbershp" }))).toContain("kuya-juns-barbershop");
    expect(slugs(await searchShops({ q: "hairkut" }))).toEqual(
      expect.arrayContaining(["kuya-juns-barbershop", "kapitolyo-cuts"]),
    );
    expect(slugs(await searchShops({ q: "aircoon" }))).toEqual(["lamig-aircon"]);
  });

  it("understands Filipino and shorthand words", async () => {
    expect(slugs(await searchShops({ q: "gupit" }))).toEqual(
      expect.arrayContaining(["kuya-juns-barbershop", "kapitolyo-cuts"]),
    );
    expect(slugs(await searchShops({ q: "ac" }))).toEqual(["lamig-aircon"]);
    expect(slugs(await searchShops({ q: "air con" }))).toEqual(["lamig-aircon"]);
  });

  it("needs every word to match, place names included", async () => {
    expect(slugs(await searchShops({ q: "haircut pasig" }))).toEqual(["kapitolyo-cuts"]);
    // "Marikna" (a typo) still limits results to Marikina; exact service matches rank first.
    const marikina = slugs(await searchShops({ q: "haircut marikna" }));
    expect(marikina).not.toContain("kapitolyo-cuts");
    expect(marikina.slice(0, 2).sort()).toEqual(["fade-station", "kuya-juns-barbershop"]);
  });

  it("matches places without accents", async () => {
    expect(slugs(await searchShops({ q: "concepcion" }))).toEqual(
      expect.arrayContaining(["kuya-juns-barbershop", "ganda-salon"]),
    );
  });

  it("does not match unrelated words", async () => {
    expect((await searchShops({ q: "laundry" })).totalCount).toBe(0);
  });

  it("ranks a shop whose name matches above one that only offers the service", async () => {
    const result = await searchShops({ q: "kapitolyo cuts" });
    expect(slugs(result)[0]).toBe("kapitolyo-cuts");
  });

  it("filters by category, including its subcategories", async () => {
    expect(slugs(await searchShops({ category: "barbershop" })).sort()).toEqual([
      "fade-station",
      "kapitolyo-cuts",
      "kuya-juns-barbershop",
    ]);
  });

  it("filters by city and barangay", async () => {
    expect((await searchShops({ city: "pasig" })).totalCount).toBe(1);
    expect(slugs(await searchShops({ city: "marikina", barangay: "malanday" })).sort()).toEqual([
      "fade-station",
      "lamig-aircon",
    ]);
  });

  it("limits a nearby search to the radius and sorts by distance", async () => {
    const result = await searchShops({ ...MARIKINA, radiusKm: 3, sort: "distance" });
    expect(slugs(result)).not.toContain("kapitolyo-cuts");
    const distances = result.items.map((shop) => shop.distanceM!);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(distances.every((meters) => meters <= 3000)).toBe(true);
  });

  it("filters by price, rating, verification and booking type", async () => {
    expect(slugs(await searchShops({ priceMax: 15_000 })).sort()).toEqual([
      "kapitolyo-cuts",
      "kuya-juns-barbershop",
    ]);
    expect(slugs(await searchShops({ priceMin: 200_000 }))).toEqual(["ganda-salon"]);
    expect(slugs(await searchShops({ minRating: 4.5 })).sort()).toEqual([
      "kuya-juns-barbershop",
      "lamig-aircon",
    ]);
    expect(slugs(await searchShops({ verified: true })).sort()).toEqual([
      "kuya-juns-barbershop",
      "lamig-aircon",
    ]);
    expect(slugs(await searchShops({ bookingType: "home" }))).toEqual(["lamig-aircon"]);
  });

  it("sorts by lowest starting price", async () => {
    expect(slugs(await searchShops({ sort: "price_asc" }))).toEqual([
      "kapitolyo-cuts",
      "kuya-juns-barbershop",
      "fade-station",
      "lamig-aircon",
      "ganda-salon",
    ]);
  });

  describe("open now", () => {
    it("uses weekly hours and skips shops that open later", async () => {
      const result = await searchShops({ openNow: true }, WEDNESDAY_MORNING);
      expect(slugs(result).sort()).toEqual([
        "kapitolyo-cuts",
        "kuya-juns-barbershop",
        "lamig-aircon",
      ]);
      expect(result.items.every((shop) => shop.isOpen)).toBe(true);
    });

    it("treats a break as closed", async () => {
      expect(slugs(await searchShops({ openNow: true }, WEDNESDAY_LUNCH))).not.toContain(
        "kuya-juns-barbershop",
      );
    });

    it("treats a closure as closed", async () => {
      // Fade Station has Wednesday hours but a closure all day.
      expect(slugs(await searchShops({ openNow: true }, WEDNESDAY_MORNING))).not.toContain(
        "fade-station",
      );
    });

    it("applies holiday rules instead of weekly hours", async () => {
      const result = await searchShops({ openNow: true }, CHRISTMAS_MORNING);
      // The barbershop closes for Christmas; the aircon shop opens special hours;
      // the Pasig shop has no rule, so its Friday hours apply.
      expect(slugs(result).sort()).toEqual(["kapitolyo-cuts", "lamig-aircon"]);
    });

    it("marks each result open or closed", async () => {
      const result = await searchShops({ city: "marikina" }, WEDNESDAY_LUNCH);
      const open = Object.fromEntries(result.items.map((shop) => [shop.slug, shop.isOpen]));
      expect(open).toMatchObject({
        "kuya-juns-barbershop": false,
        "fade-station": false,
        "lamig-aircon": true,
        "ganda-salon": false,
      });
    });
  });

  it("pages through results without repeats", async () => {
    const first = await searchShops({ limit: 2, offset: 0 });
    const second = await searchShops({ limit: 2, offset: 2 });
    const third = await searchShops({ limit: 2, offset: 4 });
    expect(first.totalCount).toBe(5);
    const all = [...slugs(first), ...slugs(second), ...slugs(third)];
    expect(new Set(all).size).toBe(5);
  });
});

describe("getListingPage against real Postgres", () => {
  it("summarizes a city-and-category page, counting subcategories", async () => {
    const data = await getListingPage({ category: "barbershop", city: "marikina" });
    expect(data).toMatchObject({
      city: { slug: "marikina", name: "Marikina" },
      barangay: null,
      shopCount: 2,
      minPriceCentavos: 15_000,
      maxPriceCentavos: 20_000,
      hasHomeService: false,
    });
    expect(data!.shops.map((shop) => shop.slug)).toEqual(["kuya-juns-barbershop", "fade-station"]);
    expect(data!.relatedCategories.map((link) => link.slug)).toEqual(
      expect.arrayContaining(["aircon-cleaning", "hair-salon"]),
    );
    expect(data!.relatedCategories.map((link) => link.slug)).not.toContain("barbershop");
  });

  it("flags home service and lists cities on a nationwide page", async () => {
    const data = await getListingPage({ category: "aircon-cleaning" });
    expect(data).toMatchObject({ city: null, shopCount: 1, hasHomeService: true });
    // One shop is below the 3-shop threshold for a city page link.
    expect(data!.cityLinks).toEqual([]);
  });

  it("narrows to a barangay", async () => {
    const data = await getListingPage({
      category: "barbershop",
      city: "marikina",
      barangay: "concepcion-uno",
    });
    expect(data).toMatchObject({ barangay: { name: "Concepción Uno" }, shopCount: 1 });
  });

  it("returns null for unknown or mismatched places, so the page 404s", async () => {
    expect(await getListingPage({ category: "no-such-thing" })).toBeNull();
    expect(await getListingPage({ category: "barbershop", city: "atlantis" })).toBeNull();
    expect(
      await getListingPage({ category: "barbershop", city: "pasig", barangay: "malanday" }),
    ).toBeNull();
  });
});

describe("recommendations against real Postgres", () => {
  async function serviceOf(shopId: string) {
    const [service] = await db
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(eq(schema.services.shopId, shopId))
      .limit(1);
    return service!.id;
  }

  it("suggests shops in the categories a customer books, and ones to book again", async () => {
    const [customer] = await db
      .insert(schema.users)
      .values({ authId: "test-customer" })
      .returning();
    const book = async (refCode: string, shopId: string, startAt: string, status: BookingStatus) =>
      db.insert(schema.bookings).values({
        refCode,
        customerId: customer!.id,
        shopId,
        serviceId: await serviceOf(shopId),
        startAt: new Date(startAt),
        status,
      });
    await book("BK-REC-1", ids.barbershop, "2026-11-01T02:00:00Z", "completed");
    // A cancelled booking says nothing about what they want.
    await book("BK-REC-2", ids.aircon, "2026-11-02T02:00:00Z", "cancelled");

    const { bookAgain, forYou } = await getCustomerRecommendations(customer!.id);
    expect(bookAgain.map((shop) => shop.slug)).toEqual(["kuya-juns-barbershop"]);
    // Shares the barbershop category; the shop already booked and the draft are left out.
    expect(forYou.map((shop) => shop.slug)).toEqual(["kapitolyo-cuts"]);
  });

  it("has nothing personal for someone who hasn't booked", async () => {
    const [newcomer] = await db
      .insert(schema.users)
      .values({ authId: "test-newcomer" })
      .returning();
    expect(await getCustomerRecommendations(newcomer!.id)).toEqual({ bookAgain: [], forYou: [] });
  });

  it("finds similar shops by shared category, never the shop itself or drafts", async () => {
    expect((await getSimilarShops(ids.barbershop)).map((shop) => shop.slug)).toEqual([
      "kapitolyo-cuts",
    ]);
    expect((await getSimilarShops(ids.pasigBarber)).map((shop) => shop.slug)).toEqual([
      "kuya-juns-barbershop",
    ]);
    expect(await getSimilarShops(ids.salon)).toEqual([]);
  });
});

describe("getSitemapEntries against real Postgres", () => {
  it("lists active shops and only listing pages with enough shops", async () => {
    const { shops, listings } = await getSitemapEntries();
    expect(shops.map((shop) => shop.slug)).not.toContain("draft-barber");
    expect(shops).toHaveLength(5);
    // Three barbershops nationwide (one through the kids-haircut subcategory); the draft doesn't count.
    expect(listings).toContain("/c/barbershop");
    // Two in Marikina is below the 3-shop threshold.
    expect(listings).not.toContain("/marikina/barbershop");
    expect(listings).not.toContain("/c/aircon-cleaning");
    expect(listings.filter((path) => path.split("/").length === 4)).toEqual([]);
  });
});

describe("openNowCondition parameters", () => {
  // PGlite accepts Date parameters in raw SQL, but postgres-js (production)
  // throws "The string argument must be of type string ... Received an instance of Date".
  it("never passes a Date to the driver", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const { openNowCondition } = await import("@/features/search/queries");
    for (const now of [WEDNESDAY_MORNING, CHRISTMAS_MORNING]) {
      const { params } = new PgDialect().sqlToQuery(openNowCondition(now));
      expect(params.filter((param) => param instanceof Date)).toEqual([]);
    }
  });
});
