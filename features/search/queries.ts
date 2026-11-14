import "server-only";

import { and, asc, desc, eq, gte, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import type { ShopCardData } from "@/components/shared/shop-card";
import { CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  barangays,
  categories,
  cities,
  media,
  services,
  shopCategories,
  shops,
} from "@/lib/db/schema";
import { MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";
import { mediaUrl } from "@/lib/media";

import { NEARBY_RADIUS_M } from "./constants";

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
    })
    .from(shops)
    .leftJoin(cities, eq(cities.id, shops.cityId))
    .leftJoin(barangays, eq(barangays.id, shops.barangayId))
    .$dynamic();
}

type ShopCardRow = Awaited<ReturnType<typeof selectShopCards>>[number];

function toShopCard({ barangayName, cityName, photoPath, ...row }: ShopCardRow): ShopCardData {
  return {
    ...row,
    ratingAvg: Number(row.ratingAvg),
    place: [barangayName, cityName].filter(Boolean).join(", ") || null,
    photoUrl: photoPath ? mediaUrl(photoPath) : null,
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
