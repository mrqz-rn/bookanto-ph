import "server-only";

import { and, asc, desc, eq, gt, gte, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
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
  shopHolidayRules,
  shops,
} from "@/lib/db/schema";
import { mediaUrl } from "@/lib/media";
import { MIN_SHOPS_FOR_BARANGAY_PAGE, MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";
import { formatManila, manilaDate, manilaWeekday } from "@/lib/time";

import { holidaysOn } from "@/features/availability/holidays";

import { NEARBY_RADIUS_M } from "./constants";
import { searchShopsSchema, type SearchShopsInput } from "./schema";
import { parseQuery, type ParsedQuery } from "./text";

/** The launch plan's home page shows 7 category tiles. */
export const HOME_CATEGORY_COUNT = 7;
/** Shops need this many reviews before they can appear in "Top rated". */
export const MIN_REVIEWS_FOR_TOP_RATED = 3;
const SHOPS_PER_SECTION = 8;

const cacheOptions = (tag: string) => ({ tags: [tag], revalidate: PUBLIC_REVALIDATE_SECONDS });

/** The shop's columns plus what a card needs from related tables. */
function selectShopCards(distanceFrom?: SQL, openAt?: Date) {
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
      // Only for per-request reads; cached lists would show a stale answer.
      isOpen: openAt ? openNowCondition(openAt) : sql<boolean | null>`null`,
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

/** Tokens shorter than this match by substring only: trigrams need some length. */
const MIN_FUZZY_TOKEN = 4;
/** How close a typed word must be to a word in the shop's text (pg_trgm word similarity). */
const WORD_SIMILARITY = 0.5;

/**
 * Everything a customer might type to find a shop: its name, categories,
 * services, barangay and city. Lowercased with accents removed, like the
 * tokens from parseQuery().
 */
const searchDocument = sql<string>`translate(lower(concat_ws(' ',
  ${shops.name}, ${cities.name}, ${barangays.name},
  (select string_agg(${categories.name}, ' ') from ${shopCategories}
    join ${categories} on ${categories.id} = ${shopCategories.categoryId}
    where ${shopCategories.shopId} = ${shops.id}),
  (select string_agg(${services.name}, ' ') from ${services}
    where ${services.shopId} = ${shops.id} and ${services.active}))),
  'ñáàâäéèêëíìîïóòôöúùûü', 'naaaaeeeeiiiioooouuuu')`;

/** The lowest active price, for "From ₱…", price filters and sorting. */
const startingPrice = sql<number | null>`(select min(${services.priceCentavos}) from ${services}
  where ${services.shopId} = ${shops.id} and ${services.active})`;

/** A token matches as a substring, or (when long enough) as a near spelling. */
function tokenMatch(token: string): SQL {
  const like = `%${token}%`;
  if (token.length < MIN_FUZZY_TOKEN) return sql`(${searchDocument} like ${like})`;
  return sql`(${searchDocument} like ${like}
    or word_similarity(${token}, ${searchDocument}) >= ${WORD_SIMILARITY})`;
}

/** How well the shop matches: 1 per exact token, less for near spellings, plus 1 when the name contains the phrase. */
function relevance(query: ParsedQuery): SQL<number> {
  const perToken = query.tokens.map(
    (token) =>
      sql`greatest(case when ${searchDocument} like ${`%${token}%`} then 1 else 0 end,
      word_similarity(${token}, ${searchDocument}))`,
  );
  const nameMatch = sql`case when translate(lower(${shops.name}), 'ñ', 'n') like ${`%${query.text}%`} then 1 else 0 end`;
  return sql<number>`(${sql.join([...perToken, nameMatch], sql` + `)})`;
}

/** The shop is listed in the category, or in one of its subcategories. */
function inCategory(slug: string): SQL {
  return sql`exists (select 1 from ${shopCategories}
    join ${categories} on ${categories.id} = ${shopCategories.categoryId}
    where ${shopCategories.shopId} = ${shops.id} and ${categories.active}
      and (${categories.slug} = ${slug}
        or ${categories.parentId} in (select parent.id from categories parent where parent.slug = ${slug})))`;
}

/**
 * Whether the shop is open at `now`, with the slot engine's rules
 * (features/availability/slots.ts): a holiday rule for today replaces the
 * weekly hours (closed when it has no hours), breaks don't count as open, and
 * a closure covering `now` wins over everything.
 */
export function openNowCondition(now: Date): SQL<boolean> {
  const time = formatManila(now, "HH:mm:ss");
  const weekday = manilaWeekday(now);
  const holidayKeys = holidaysOn(manilaDate(now)).map((holiday) => holiday.key);

  // An ISO string, not a Date: postgres-js can't serialize a Date inside raw sql.
  const at = sql`${now.toISOString()}::timestamptz`;
  const notClosed = sql`not exists (select 1 from ${closures}
    where ${closures.shopId} = ${shops.id} and ${closures.startsAt} <= ${at} and ${closures.endsAt} > ${at})`;
  const weeklyOpen = sql`exists (select 1 from ${businessHours}
    where ${businessHours.shopId} = ${shops.id} and ${businessHours.weekday} = ${weekday}
      and ${businessHours.opens} <= ${time}::time and ${businessHours.closes} > ${time}::time
      and (${businessHours.breakStart} is null
        or not (${businessHours.breakStart} <= ${time}::time and ${businessHours.breakEnd} > ${time}::time)))`;
  if (holidayKeys.length === 0) return sql<boolean>`(${weeklyOpen} and ${notClosed})`;

  const keys = sql.join(
    holidayKeys.map((key) => sql`${key}`),
    sql`, `,
  );
  const hasRule = sql`exists (select 1 from ${shopHolidayRules}
    where ${shopHolidayRules.shopId} = ${shops.id} and ${shopHolidayRules.holidayKey} in (${keys}))`;
  // Every rule for today must have hours that include now (two rules: the shorter hours win).
  const rulesOpen = sql`not exists (select 1 from ${shopHolidayRules}
    where ${shopHolidayRules.shopId} = ${shops.id} and ${shopHolidayRules.holidayKey} in (${keys})
      and (${shopHolidayRules.opens} is null or ${shopHolidayRules.closes} is null
        or ${shopHolidayRules.opens} > ${time}::time or ${shopHolidayRules.closes} <= ${time}::time))`;
  return sql<boolean>`((case when ${hasRule} then ${rulesOpen} else ${weeklyOpen} end) and ${notClosed})`;
}

/**
 * The search behind /search: typo-tolerant text matching, category, place,
 * nearby radius, booking type, price, rating, verified and "open now"
 * filters, five sorts, and paging. Not cached: results depend on the time of
 * day and on many filters.
 */
export async function searchShops(
  input: SearchShopsInput,
  now: Date = new Date(),
): Promise<SearchShopsResult> {
  const filters = searchShopsSchema.parse(input);
  const query = parseQuery(filters.q);
  const here =
    filters.lat !== undefined && filters.lng !== undefined
      ? sql`ST_SetSRID(ST_MakePoint(${filters.lng}::double precision, ${filters.lat}::double precision), 4326)::geography`
      : undefined;

  const conditions: SQL[] = [eq(shops.status, "active")];
  if (query) conditions.push(...query.tokens.map(tokenMatch));
  if (filters.category) conditions.push(inCategory(filters.category));
  if (filters.city) {
    conditions.push(eq(cities.slug, filters.city));
    if (filters.barangay) conditions.push(eq(barangays.slug, filters.barangay));
  }
  if (here) {
    conditions.push(
      sql`ST_DWithin(${shops.location}, ${here}, ${filters.radiusKm * 1000}::double precision)`,
    );
  }
  if (filters.bookingType) {
    conditions.push(sql`exists (select 1 from ${services}
      where ${services.shopId} = ${shops.id} and ${services.active}
        and ${services.bookingType} = ${filters.bookingType})`);
  }
  if (filters.priceMin !== undefined) conditions.push(sql`${startingPrice} >= ${filters.priceMin}`);
  if (filters.priceMax !== undefined) conditions.push(sql`${startingPrice} <= ${filters.priceMax}`);
  if (filters.minRating !== undefined) {
    conditions.push(gte(shops.ratingAvg, filters.minRating), gt(shops.ratingCount, 0));
  }
  if (filters.verified) conditions.push(isNotNull(shops.verifiedAt));
  if (filters.openNow) conditions.push(openNowCondition(now));

  const best = [
    desc(sql`${shops.verifiedAt} is not null`),
    desc(shops.ratingAvg),
    desc(shops.ratingCount),
  ];
  let order: SQL[];
  switch (filters.sort) {
    case "distance":
      order = here ? [sql`ST_Distance(${shops.location}, ${here})`] : best;
      break;
    case "rating":
      order = [desc(shops.ratingAvg), desc(shops.ratingCount)];
      break;
    case "price_asc":
      order = [sql`${startingPrice} asc nulls last`, ...best];
      break;
    case "newest":
      order = [sql`${shops.verifiedAt} desc nulls last`, desc(shops.createdAt)];
      break;
    default:
      order = query ? [desc(relevance(query)), ...best] : best;
  }
  // A stable last key keeps pages from repeating or skipping shops.
  order.push(asc(shops.id));

  const where = and(...conditions);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shops)
    .leftJoin(cities, eq(cities.id, shops.cityId))
    .leftJoin(barangays, eq(barangays.id, shops.barangayId))
    .where(where);

  const rows = await selectShopCards(here, now)
    .where(where)
    .orderBy(...order)
    .limit(filters.limit)
    .offset(filters.offset);

  return { items: rows.map(toShopCard), totalCount: countRow?.count ?? 0 };
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
    if (options?.categorySlug) conditions.push(inCategory(options.categorySlug));
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
  { tags: [CACHE_TAGS.cities, CACHE_TAGS.shops], revalidate: PUBLIC_REVALIDATE_SECONDS },
);

export type CategoryOption = { slug: string; name: string; icon: string | null };

/** Every active category, for the search filters (subcategories after their parent). */
export const getCategoryOptions = unstable_cache(
  async (): Promise<CategoryOption[]> =>
    db
      .select({ slug: categories.slug, name: categories.name, icon: categories.icon })
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ["category-options"],
  cacheOptions(CACHE_TAGS.categories),
);

export type PlaceLink = { slug: string; name: string; count: number };

export type ListingPageData = {
  category: { slug: string; name: string; icon: string | null };
  city: { slug: string; name: string } | null;
  barangay: { slug: string; name: string } | null;
  shopCount: number;
  /** Lowest and highest starting price among the listed shops, in centavos. */
  minPriceCentavos: number | null;
  maxPriceCentavos: number | null;
  hasHomeService: boolean;
  shops: ShopCardData[];
  /** On a city page: barangays with enough shops for their own page. */
  barangayLinks: PlaceLink[];
  /** On a nationwide page: cities with enough shops for their own page. */
  cityLinks: PlaceLink[];
  /** Other categories with shops in the same place. */
  relatedCategories: PlaceLink[];
};

const LISTING_SHOPS = 24;

/**
 * Everything a category page needs: /c/[category], /[city]/[category] or
 * /[city]/[barangay]/[category]. Null when the category, city or barangay
 * doesn't exist or isn't active.
 */
export const getListingPage = unstable_cache(
  async (scope: {
    category: string;
    city?: string;
    barangay?: string;
  }): Promise<ListingPageData | null> => {
    const [category] = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
      })
      .from(categories)
      .where(and(eq(categories.slug, scope.category), eq(categories.active, true)))
      .limit(1);
    if (!category) return null;

    let city: { id: string; slug: string; name: string } | null = null;
    if (scope.city) {
      city =
        (
          await db
            .select({ id: cities.id, slug: cities.slug, name: cities.name })
            .from(cities)
            .where(and(eq(cities.slug, scope.city), eq(cities.isActive, true)))
            .limit(1)
        )[0] ?? null;
      if (!city) return null;
    }
    let barangay: { id: string; slug: string; name: string } | null = null;
    if (scope.barangay) {
      if (!city) return null;
      barangay =
        (
          await db
            .select({ id: barangays.id, slug: barangays.slug, name: barangays.name })
            .from(barangays)
            .where(
              and(
                eq(barangays.cityId, city.id),
                eq(barangays.slug, scope.barangay),
                eq(barangays.isActive, true),
              ),
            )
            .limit(1)
        )[0] ?? null;
      if (!barangay) return null;
    }

    const place: SQL[] = [eq(shops.status, "active")];
    if (city) place.push(eq(shops.cityId, city.id));
    if (barangay) place.push(eq(shops.barangayId, barangay.id));
    const inPlace = and(...place);
    const inScope = and(inPlace, inCategory(category.slug));

    const [stats] = await db
      .select({
        count: sql<number>`count(*)::int`,
        minPrice: sql<number | null>`min(${startingPrice})`,
        maxPrice: sql<number | null>`max(${startingPrice})`,
        homeService: sql<boolean>`coalesce(bool_or(exists (select 1 from ${services}
          where ${services.shopId} = ${shops.id} and ${services.active} and ${services.bookingType} = 'home')), false)`,
      })
      .from(shops)
      // The join makes Drizzle qualify column names inside the sql fields above;
      // in a single-table select it writes "shop_id" = "id", which matches nothing.
      .leftJoin(cities, eq(cities.id, shops.cityId))
      .where(inScope);

    const rows = await selectShopCards()
      .where(inScope)
      .orderBy(desc(shops.ratingAvg), desc(shops.ratingCount), asc(shops.id))
      .limit(LISTING_SHOPS);

    const shopCount = sql<number>`count(*)::int`;
    const barangayLinks =
      city && !barangay
        ? await db
            .select({ slug: barangays.slug, name: barangays.name, count: shopCount })
            .from(shops)
            .innerJoin(barangays, eq(barangays.id, shops.barangayId))
            .where(and(inScope, eq(barangays.isActive, true)))
            .groupBy(barangays.slug, barangays.name)
            .having(gte(shopCount, MIN_SHOPS_FOR_BARANGAY_PAGE))
            .orderBy(desc(shopCount), asc(barangays.name))
        : [];
    const cityLinks = !city
      ? await db
          .select({ slug: cities.slug, name: cities.name, count: shopCount })
          .from(shops)
          .innerJoin(cities, eq(cities.id, shops.cityId))
          .where(and(inScope, eq(cities.isActive, true)))
          .groupBy(cities.slug, cities.name)
          .having(gte(shopCount, MIN_SHOPS_FOR_LISTING_PAGE))
          .orderBy(desc(shopCount), asc(cities.name))
      : [];
    const relatedCategories = await db
      .select({ slug: categories.slug, name: categories.name, count: shopCount })
      .from(shops)
      .innerJoin(shopCategories, eq(shopCategories.shopId, shops.id))
      .innerJoin(categories, eq(categories.id, shopCategories.categoryId))
      .where(and(inPlace, eq(categories.active, true), ne(categories.id, category.id)))
      .groupBy(categories.slug, categories.name)
      .orderBy(desc(shopCount), asc(categories.name))
      .limit(8);

    return {
      category: { slug: category.slug, name: category.name, icon: category.icon },
      city: city && { slug: city.slug, name: city.name },
      barangay: barangay && { slug: barangay.slug, name: barangay.name },
      shopCount: stats?.count ?? 0,
      minPriceCentavos: stats?.minPrice ?? null,
      maxPriceCentavos: stats?.maxPrice ?? null,
      hasHomeService: stats?.homeService ?? false,
      shops: rows.map(toShopCard),
      barangayLinks,
      cityLinks,
      relatedCategories,
    };
  },
  ["listing-page"],
  {
    tags: [CACHE_TAGS.shops, CACHE_TAGS.categories, CACHE_TAGS.cities],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  },
);

/**
 * Shops like this one, for "Similar shops" on a shop page: a shared category,
 * same city first, then verified and best rated.
 */
export const getSimilarShops = unstable_cache(
  async (shopId: string, limit = 4): Promise<ShopCardData[]> => {
    const rows = await selectShopCards()
      .where(
        and(
          eq(shops.status, "active"),
          ne(shops.id, shopId),
          sql`exists (select 1 from ${shopCategories}
            where ${shopCategories.shopId} = ${shops.id}
              and ${shopCategories.categoryId} in
                (select source.category_id from shop_categories source where source.shop_id = ${shopId}))`,
        ),
      )
      .orderBy(
        sql`(${shops.cityId} = (select source.city_id from shops source where source.id = ${shopId})) desc nulls last`,
        sql`${shops.verifiedAt} is not null desc`,
        desc(shops.ratingAvg),
        desc(shops.ratingCount),
        asc(shops.id),
      )
      .limit(limit);
    return rows.map(toShopCard);
  },
  ["similar-shops"],
  cacheOptions(CACHE_TAGS.shops),
);

export type CustomerRecommendations = {
  /** Shops the customer completed a booking with, most recent first. */
  bookAgain: ShopCardData[];
  /** Shops they haven't booked, in the categories and cities they book. */
  forYou: ShopCardData[];
};

/** Bookings that show what a customer wants (declined and expired requests don't). */
const INTEREST_STATUSES = sql.raw(`('requested', 'quoted', 'confirmed', 'completed')`);

/**
 * Personal recommendations from the customer's own bookings. Not cached: it's
 * per person, and only rendered on the signed-in /explore page. Both lists are
 * empty for someone who hasn't booked yet; the page then shows the general
 * "Top rated" and "New shops".
 */
export async function getCustomerRecommendations(
  userId: string,
  limit = 8,
): Promise<CustomerRecommendations> {
  const booked = sql`select mine.shop_id from bookings mine
    where mine.customer_id = ${userId} and mine.status in ${INTEREST_STATUSES}`;
  // Each past booking counts once per category it shares with this shop.
  const categoryAffinity = sql`(select count(*) from (${booked}) b
    join shop_categories liked on liked.shop_id = b.shop_id
    join shop_categories theirs on theirs.category_id = liked.category_id
    where theirs.shop_id = ${shops.id})`;
  const cityAffinity = sql`(select count(*) from (${booked}) b
    join shops booked_shop on booked_shop.id = b.shop_id
    where booked_shop.city_id = ${shops.cityId})`;
  const lastCompleted = sql`(select max(done.start_at) from bookings done
    where done.shop_id = ${shops.id} and done.customer_id = ${userId} and done.status = 'completed')`;

  const [bookAgain, forYou] = await Promise.all([
    selectShopCards()
      .where(and(eq(shops.status, "active"), sql`${lastCompleted} is not null`))
      .orderBy(sql`${lastCompleted} desc`, asc(shops.id))
      .limit(limit),
    selectShopCards()
      .where(
        and(
          eq(shops.status, "active"),
          sql`${shops.id} not in (${booked})`,
          sql`${categoryAffinity} > 0`,
        ),
      )
      .orderBy(
        sql`${categoryAffinity} * 2 + ${cityAffinity} desc`,
        sql`${shops.verifiedAt} is not null desc`,
        desc(shops.ratingAvg),
        desc(shops.ratingCount),
        asc(shops.id),
      )
      .limit(limit),
  ]);
  return { bookAgain: bookAgain.map(toShopCard), forYou: forYou.map(toShopCard) };
}

export type SitemapEntries = {
  shops: Array<{ slug: string; updatedAt: Date }>;
  /** Paths of city, category, city-and-category and barangay-and-category pages. */
  listings: string[];
};

/**
 * Every public page worth indexing: active shops, plus listing pages with
 * enough shops to be indexed (the same thresholds as their robots tags). A
 * shop in a subcategory counts toward its parent category too.
 */
export async function getSitemapEntries(): Promise<SitemapEntries> {
  const shopRows = await db
    .select({ slug: shops.slug, updatedAt: shops.updatedAt })
    .from(shops)
    .where(eq(shops.status, "active"))
    .orderBy(asc(shops.slug));

  // Each active shop with each category it belongs to, directly or through a subcategory.
  const listed = sql`(
    select ${shops.id} as shop_id, ${shops.cityId} as city_id, ${shops.barangayId} as barangay_id,
      ${categories.slug} as category
    from ${shops}
    join ${shopCategories} on ${shopCategories.shopId} = ${shops.id}
    join ${categories} on ${categories.id} = ${shopCategories.categoryId}
      or ${categories.id} = (select child.parent_id from categories child where child.id = ${shopCategories.categoryId})
    where ${shops.status} = 'active' and ${categories.active}
  )`;
  const [cityPages, categoryPages, cityCategoryPages, barangayPages] = await Promise.all([
    db
      .select({ city: cities.slug })
      .from(shops)
      .innerJoin(cities, eq(cities.id, shops.cityId))
      .where(and(eq(shops.status, "active"), eq(cities.isActive, true)))
      .groupBy(cities.slug)
      .having(gte(sql`count(*)`, MIN_SHOPS_FOR_LISTING_PAGE)),
    db.execute<{ category: string }>(sql`select l.category from ${listed} l
      group by l.category having count(distinct l.shop_id) >= ${MIN_SHOPS_FOR_LISTING_PAGE}`),
    db.execute<{
      city: string;
      category: string;
    }>(sql`select c.slug as city, l.category from ${listed} l
      join cities c on c.id = l.city_id and c.is_active
      group by c.slug, l.category having count(distinct l.shop_id) >= ${MIN_SHOPS_FOR_LISTING_PAGE}`),
    db.execute<{ city: string; barangay: string; category: string }>(sql`select c.slug as city,
        b.slug as barangay, l.category from ${listed} l
      join cities c on c.id = l.city_id and c.is_active
      join barangays b on b.id = l.barangay_id and b.is_active
      group by c.slug, b.slug, l.category
      having count(distinct l.shop_id) >= ${MIN_SHOPS_FOR_BARANGAY_PAGE}`),
  ]);

  return {
    shops: shopRows,
    listings: [
      ...cityPages.map((row) => `/${row.city}`),
      ...rowsOf(categoryPages).map((row) => `/c/${row.category}`),
      ...rowsOf(cityCategoryPages).map((row) => `/${row.city}/${row.category}`),
      ...rowsOf(barangayPages).map((row) => `/${row.city}/${row.barangay}/${row.category}`),
    ].sort(),
  };
}

/** Rows from db.execute: postgres-js returns them directly, PGlite (tests) as { rows }. */
function rowsOf<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows;
}
