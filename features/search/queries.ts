import "server-only";

import { and, asc, desc, eq, gte, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import type { ShopCardData } from "@/components/shared/shop-card";
import { CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  barangays,
  businessHours,
  categories,
  cities,
  closures,
  media,
  services,
  shopCategories,
  shops,
} from "@/lib/db/schema";
import { mediaUrl } from "@/lib/media";
import { MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";
import { formatManila, manilaWeekday } from "@/lib/time";

import { NEARBY_RADIUS_M } from "./constants";
import type { SearchShopsInput } from "./schema";

/** The launch plan's home page shows 7 category tiles. */
export const HOME_CATEGORY_COUNT = 7;
/** Shops need this many reviews before they can appear in "Top rated". */
export const MIN_REVIEWS_FOR_TOP_RATED = 3;
const SHOPS_PER_SECTION = 8;

const cacheOptions = (tag: string) => ({ tags: [tag], revalidate: PUBLIC_REVALIDATE_SECONDS });

/** The shop's columns plus what a card needs from related tables. */
function selectShopCards(distanceFrom?: SQL) {
  return db
    .select({
      id: shops.id,
      slug: shops.slug,
      name: shops.name,
      ratingAvg: shops.ratingAvg,
      ratingCount: shops.ratingCount,
      verified: sql<boolean>`${shops.verifiedAt} is not null`,
      cityName: cities.name,
      barangayName: barangays.name,
      fromPriceCentavos: sql<number | null>`(
        select min(${services.priceCentavos}) from ${services}
        where ${services.shopId} = ${shops.id} and ${services.active})`,
      categoryName: sql<string | null>`(
        select ${categories.name} from ${shopCategories}
        join ${categories} on ${categories.id} = ${shopCategories.categoryId}
        where ${shopCategories.shopId} = ${shops.id}
        order by ${categories.sortOrder} limit 1)`,
      categoryIcon: sql<string | null>`(
        select ${categories.icon} from ${shopCategories}
        join ${categories} on ${categories.id} = ${shopCategories.categoryId}
        where ${shopCategories.shopId} = ${shops.id}
        order by ${categories.sortOrder} limit 1)`,
      photoPath: sql<string | null>`(
        select ${media.path} from ${media}
        where ${media.ownerType} = 'shop' and ${media.ownerId} = ${shops.id} and ${media.kind} = 'photo'
        order by ${media.sortOrder} limit 1)`,
      distanceM: distanceFrom
        ? sql<number | null>`ST_Distance(${shops.location}, ${distanceFrom})`
        : sql<number | null>`null`,
      lat: sql<number | null>`ST_Y(${shops.location}::geometry)`,
      lng: sql<number | null>`ST_X(${shops.location}::geometry)`,
    })
    .from(shops)
    .leftJoin(cities, eq(cities.id, shops.cityId))
    .leftJoin(barangays, eq(barangays.id, shops.barangayId))
    .$dynamic();
}

type ShopCardRow = Awaited<ReturnType<typeof selectShopCards>>[number];

function toShopCard({
  barangayName,
  cityName,
  photoPath,
  lat,
  lng,
  ...row
}: ShopCardRow): ShopCardData {
  return {
    ...row,
    ratingAvg: Number(row.ratingAvg),
    place: [barangayName, cityName].filter(Boolean).join(", ") || null,
    photoUrl: photoPath ? mediaUrl(photoPath) : null,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
  };
}

export type HomeCategory = { slug: string; name: string; icon: string | null };

export const getHomeCategories = unstable_cache(
  async (): Promise<HomeCategory[]> =>
    db
      .select({ slug: categories.slug, name: categories.name, icon: categories.icon })
      .from(categories)
      .where(and(eq(categories.active, true), isNull(categories.parentId)))
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .limit(HOME_CATEGORY_COUNT),
  ["home-categories"],
  cacheOptions(CACHE_TAGS.categories),
);

export const getTopRatedShops = unstable_cache(
  async (): Promise<ShopCardData[]> => {
    const rows = await selectShopCards()
      .where(and(eq(shops.status, "active"), gte(shops.ratingCount, MIN_REVIEWS_FOR_TOP_RATED)))
      .orderBy(desc(shops.ratingAvg), desc(shops.ratingCount))
      .limit(SHOPS_PER_SECTION);
    return rows.map(toShopCard);
  },
  ["top-rated-shops"],
  cacheOptions(CACHE_TAGS.shops),
);

/** Most recently approved first. */
export const getNewShops = unstable_cache(
  async (): Promise<ShopCardData[]> => {
    const rows = await selectShopCards()
      .where(eq(shops.status, "active"))
      .orderBy(sql`${shops.verifiedAt} desc nulls last`, desc(shops.createdAt))
      .limit(SHOPS_PER_SECTION);
    return rows.map(toShopCard);
  },
  ["new-shops"],
  cacheOptions(CACHE_TAGS.shops),
);

/**
 * Active shops within NEARBY_RADIUS_M of a point, most reviewed first.
 * Callers pass coarsened coordinates, so nearby customers share cache entries.
 */
export const getPopularShopsNear = unstable_cache(
  async (lat: number, lng: number): Promise<ShopCardData[]> => {
    const here = sql`ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography`;
    const rows = await selectShopCards(here)
      .where(
        and(
          eq(shops.status, "active"),
          sql`ST_DWithin(${shops.location}, ${here}, ${NEARBY_RADIUS_M}::double precision)`,
        ),
      )
      .orderBy(desc(shops.ratingCount), sql`ST_Distance(${shops.location}, ${here})`)
      .limit(SHOPS_PER_SECTION);
    return rows.map(toShopCard);
  },
  ["popular-shops-near"],
  cacheOptions(CACHE_TAGS.shops),
);

export type CityOption = { slug: string; name: string; lat: number; lng: number };

/** Cities customers can pick instead of sharing their location. */
export const getActiveCities = unstable_cache(
  async (): Promise<CityOption[]> => {
    const rows = await db
      .select({ slug: cities.slug, name: cities.name, center: cities.center })
      .from(cities)
      .where(and(eq(cities.isActive, true), isNotNull(cities.center)))
      .orderBy(asc(cities.name));
    return rows.flatMap(({ center, ...city }) => (center ? [{ ...city, ...center }] : []));
  },
  ["active-cities"],
  cacheOptions(CACHE_TAGS.cities),
);

export type ListingLink = {
  citySlug: string;
  cityName: string;
  categorySlug: string;
  categoryName: string;
};

/** City-and-category pages with enough shops to be published, busiest first. */
export const getPopularListingLinks = unstable_cache(
  async (): Promise<ListingLink[]> => {
    const shopCount = sql<number>`count(*)::int`;
    return db
      .select({
        citySlug: cities.slug,
        cityName: cities.name,
        categorySlug: categories.slug,
        categoryName: categories.name,
      })
      .from(shops)
      .innerJoin(cities, and(eq(cities.id, shops.cityId), eq(cities.isActive, true)))
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .innerJoin(
        categories,
        and(eq(categories.id, shopCategories.categoryId), eq(categories.active, true)),
      )
      .where(eq(shops.status, "active"))
      .groupBy(cities.slug, cities.name, categories.slug, categories.name)
      .having(gte(shopCount, MIN_SHOPS_FOR_LISTING_PAGE))
      .orderBy(desc(shopCount), asc(categories.name))
      .limit(12);
  },
  ["popular-listing-links"],
  cacheOptions(CACHE_TAGS.shops),
);

export type SearchShopsResult = {
  items: ShopCardData[];
  totalCount: number;
};

/**
 * Searches shops with keyword matching (typo-tolerant across name, description,
 * categories, services, and locations), category/city filters, booking types,
 * price ranges, "open now" calculation in Manila time, distance, and sorting.
 */
export async function searchShops(input: SearchShopsInput): Promise<SearchShopsResult> {
  const conditions: SQL[] = [eq(shops.status, "active")];

  const here =
    input.lat !== undefined && input.lng !== undefined
      ? sql`ST_SetSRID(ST_MakePoint(${input.lng}::double precision, ${input.lat}::double precision), 4326)::geography`
      : undefined;

  const queryText = (input.q ?? "").trim();
  if (queryText.length > 0) {
    const words = queryText.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      const term = `%${w}%`;
      conditions.push(
        sql`(
          ${shops.name} ILIKE ${term}
          OR ${shops.description} ILIKE ${term}
          OR ${cities.name} ILIKE ${term}
          OR ${barangays.name} ILIKE ${term}
          OR EXISTS (
            SELECT 1 FROM ${shopCategories} sc
            JOIN ${categories} c ON c.id = sc.categoryId
            WHERE sc.shopId = ${shops.id} AND c.name ILIKE ${term}
          )
          OR EXISTS (
            SELECT 1 FROM ${services} s
            WHERE s.shopId = ${shops.id} AND s.name ILIKE ${term}
          )
        )`,
      );
    }
  }

  if (input.category) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${shopCategories} sc
        JOIN ${categories} c ON c.id = sc.categoryId
        WHERE sc.shopId = ${shops.id} AND c.slug = ${input.category}
      )`,
    );
  }

  if (input.city) {
    conditions.push(eq(cities.slug, input.city));
  }

  if (input.bookingType) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${services} s
        WHERE s.shopId = ${shops.id} AND s.active = true AND s.bookingType = ${input.bookingType}
      )`,
    );
  }

  if (input.priceMin !== undefined) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${services} s
        WHERE s.shopId = ${shops.id} AND s.active = true AND s.priceCentavos IS NOT NULL AND s.priceCentavos >= ${input.priceMin}
      )`,
    );
  }

  if (input.priceMax !== undefined) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${services} s
        WHERE s.shopId = ${shops.id} AND s.active = true AND s.priceCentavos IS NOT NULL AND s.priceCentavos <= ${input.priceMax}
      )`,
    );
  }

  if (input.openNow) {
    const now = new Date();
    const currentWeekday = manilaWeekday(now);
    const currentTime = formatManila(now, "HH:mm:ss");
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${businessHours} bh
        WHERE bh.shopId = ${shops.id}
          AND bh.weekday = ${currentWeekday}
          AND bh.opens <= ${currentTime}::time
          AND bh.closes > ${currentTime}::time
          AND (bh.breakStart IS NULL OR NOT (bh.breakStart <= ${currentTime}::time AND bh.breakEnd > ${currentTime}::time))
      )`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${closures} cl
        WHERE cl.shopId = ${shops.id}
          AND cl.startsAt <= ${now}
          AND cl.endsAt > ${now}
      )`,
    );
  }

  let orderByClause: SQL[];
  switch (input.sort) {
    case "distance":
      orderByClause = here
        ? [sql`ST_Distance(${shops.location}, ${here})`]
        : [desc(shops.ratingAvg), desc(shops.ratingCount)];
      break;
    case "rating":
      orderByClause = [desc(shops.ratingAvg), desc(shops.ratingCount)];
      break;
    case "price_asc":
      orderByClause = [
        sql`(SELECT min(${services.priceCentavos}) FROM ${services} WHERE ${services.shopId} = ${shops.id} AND ${services.active} = true) ASC NULLS LAST`,
      ];
      break;
    case "newest":
      orderByClause = [desc(shops.createdAt)];
      break;
    case "recommended":
    default:
      orderByClause = [
        sql`CASE WHEN ${shops.verifiedAt} IS NOT NULL THEN 1 ELSE 0 END DESC`,
        desc(shops.ratingAvg),
        desc(shops.ratingCount),
      ];
      break;
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shops)
    .leftJoin(cities, eq(cities.id, shops.cityId))
    .leftJoin(barangays, eq(barangays.id, shops.barangayId))
    .where(and(...conditions));

  const totalCount = countResult?.count ?? 0;

  const rows = await selectShopCards(here)
    .where(and(...conditions))
    .orderBy(...orderByClause)
    .limit(input.limit)
    .offset(input.offset);

  return {
    items: rows.map(toShopCard),
    totalCount,
  };
}

/**
 * Recommendations for discovery: top-rated and verified shops, optionally
 * scoped to a category or excluding a specific shop.
 */
export const getRecommendedShops = unstable_cache(
  async (options?: {
    excludeShopId?: string;
    categorySlug?: string;
    limit?: number;
  }): Promise<ShopCardData[]> => {
    const limit = options?.limit ?? 8;
    const conditions: SQL[] = [eq(shops.status, "active")];
    if (options?.excludeShopId) {
      conditions.push(ne(shops.id, options.excludeShopId));
    }
    if (options?.categorySlug) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${shopCategories} sc
          JOIN ${categories} c ON c.id = sc.categoryId
          WHERE sc.shopId = ${shops.id} AND c.slug = ${options.categorySlug}
        )`,
      );
    }
    const rows = await selectShopCards()
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${shops.verifiedAt} IS NOT NULL THEN 1 ELSE 0 END DESC`,
        desc(shops.ratingAvg),
        desc(shops.ratingCount),
      )
      .limit(limit);
    return rows.map(toShopCard);
  },
  ["recommended-shops"],
  cacheOptions(CACHE_TAGS.shops),
);

export type CategoryDetail = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  shopCount: number;
  shops: ShopCardData[];
};

/** Category nationwide listing page data. */
export const getCategoryListing = unstable_cache(
  async (categorySlug: string): Promise<CategoryDetail | null> => {
    const [category] = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
      })
      .from(categories)
      .where(and(eq(categories.slug, categorySlug), eq(categories.active, true)))
      .limit(1);

    if (!category) return null;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shops)
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .where(and(eq(shops.status, "active"), eq(shopCategories.categoryId, category.id)));

    const shopRows = await selectShopCards()
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .where(and(eq(shops.status, "active"), eq(shopCategories.categoryId, category.id)))
      .orderBy(desc(shops.ratingAvg), desc(shops.ratingCount))
      .limit(24);

    return {
      ...category,
      shopCount: countResult?.count ?? 0,
      shops: shopRows.map(toShopCard),
    };
  },
  ["category-listing"],
  cacheOptions(CACHE_TAGS.categories),
);

export type CityCategoryDetail = {
  city: { id: string; slug: string; name: string };
  category: { id: string; slug: string; name: string; icon: string | null };
  shopCount: number;
  fromPriceCentavos: number | null;
  shops: ShopCardData[];
};

/** City and category landing page data (e.g. /marikina/barbershop). */
export const getCityCategoryListing = unstable_cache(
  async (citySlug: string, categorySlug: string): Promise<CityCategoryDetail | null> => {
    const [city] = await db
      .select({ id: cities.id, slug: cities.slug, name: cities.name })
      .from(cities)
      .where(and(eq(cities.slug, citySlug), eq(cities.isActive, true)))
      .limit(1);

    const [category] = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
      })
      .from(categories)
      .where(and(eq(categories.slug, categorySlug), eq(categories.active, true)))
      .limit(1);

    if (!city || !category) return null;

    const [countResult] = await db
      .select({
        count: sql<number>`count(distinct ${shops.id})::int`,
        minPrice: sql<number | null>`min(${services.priceCentavos})`,
      })
      .from(shops)
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .leftJoin(services, and(eq(services.shopId, shops.id), eq(services.active, true)))
      .where(
        and(
          eq(shops.status, "active"),
          eq(shops.cityId, city.id),
          eq(shopCategories.categoryId, category.id),
        ),
      );

    const shopRows = await selectShopCards()
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .where(
        and(
          eq(shops.status, "active"),
          eq(shops.cityId, city.id),
          eq(shopCategories.categoryId, category.id),
        ),
      )
      .orderBy(desc(shops.ratingAvg), desc(shops.ratingCount))
      .limit(24);

    return {
      city,
      category,
      shopCount: countResult?.count ?? 0,
      fromPriceCentavos: countResult?.minPrice ?? null,
      shops: shopRows.map(toShopCard),
    };
  },
  ["city-category-listing"],
  cacheOptions(CACHE_TAGS.shops),
);

export type CityDetail = {
  city: { id: string; slug: string; name: string };
  shopCount: number;
  categories: Array<{ slug: string; name: string; count: number }>;
  shops: ShopCardData[];
};

/** City nationwide listing page data (e.g. /marikina). */
export const getCityListing = unstable_cache(
  async (citySlug: string): Promise<CityDetail | null> => {
    const [city] = await db
      .select({ id: cities.id, slug: cities.slug, name: cities.name })
      .from(cities)
      .where(and(eq(cities.slug, citySlug), eq(cities.isActive, true)))
      .limit(1);

    if (!city) return null;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shops)
      .where(and(eq(shops.status, "active"), eq(shops.cityId, city.id)));

    const popularCategories = await db
      .select({
        slug: categories.slug,
        name: categories.name,
        count: sql<number>`count(*)::int`,
      })
      .from(shops)
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .innerJoin(categories, eq(categories.id, shopCategories.categoryId))
      .where(and(eq(shops.status, "active"), eq(shops.cityId, city.id)))
      .groupBy(categories.slug, categories.name)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const shopRows = await selectShopCards()
      .where(and(eq(shops.status, "active"), eq(shops.cityId, city.id)))
      .orderBy(desc(shops.ratingAvg), desc(shops.ratingCount))
      .limit(24);

    return {
      city,
      shopCount: countResult?.count ?? 0,
      categories: popularCategories,
      shops: shopRows.map(toShopCard),
    };
  },
  ["city-listing"],
  cacheOptions(CACHE_TAGS.cities),
);
