import "server-only";

import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  barangays,
  businessHours,
  categories,
  cities,
  media,
  shopCategories,
  shopMembers,
  shops,
} from "@/lib/db/schema";

/**
 * Returns all shops the current user owns or is a member of.
 */
export async function getUserShops() {
  const user = await getCurrentUser();
  if (!user) return [];

  const userMemberships = await db
    .select({
      shopId: shopMembers.shopId,
      role: shopMembers.role,
      active: shopMembers.active,
    })
    .from(shopMembers)
    .where(and(eq(shopMembers.userId, user.id), eq(shopMembers.active, true)));

  if (userMemberships.length === 0) return [];

  const shopIds = userMemberships.map((m) => m.shopId);
  const userShops = await db.select().from(shops).where(inArray(shops.id, shopIds));

  return userShops.map((shop) => ({
    ...shop,
    membershipRole: userMemberships.find((m) => m.shopId === shop.id)?.role,
  }));
}

/**
 * Loads full shop onboarding details: details, categories, hours, photos, documents.
 */
export async function getShopForOnboarding(shopId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);

  if (!shop) return null;

  const currentCategories = await db
    .select({
      categoryId: shopCategories.categoryId,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
    })
    .from(shopCategories)
    .innerJoin(categories, eq(shopCategories.categoryId, categories.id))
    .where(eq(shopCategories.shopId, shopId));

  const hours = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.shopId, shopId))
    .orderBy(asc(businessHours.weekday));

  const photos = await db
    .select()
    .from(media)
    .where(and(eq(media.ownerType, "shop"), eq(media.ownerId, shopId), eq(media.kind, "photo")))
    .orderBy(asc(media.sortOrder));

  const documents = await db
    .select()
    .from(media)
    .where(and(eq(media.ownerType, "shop"), eq(media.ownerId, shopId), eq(media.kind, "document")))
    .orderBy(asc(media.sortOrder));

  return {
    shop,
    categories: currentCategories,
    hours,
    photos,
    documents,
  };
}

/**
 * Returns all active cities with their active barangays for location picker.
 */
export async function getCitiesAndBarangays() {
  const allCities = await db
    .select()
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.name));

  const allBarangays = await db
    .select()
    .from(barangays)
    .where(eq(barangays.isActive, true))
    .orderBy(asc(barangays.name));

  return allCities.map((city) => ({
    ...city,
    barangays: allBarangays.filter((b) => b.cityId === city.id),
  }));
}

/**
 * Returns all active categories for shop classification.
 */
export async function getActiveCategories() {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.active, true), isNull(categories.parentId)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/**
 * Checks whether a given slug is available.
 */
export async function isSlugAvailable(slug: string, excludeShopId?: string): Promise<boolean> {
  const query = db
    .select({ id: shops.id })
    .from(shops)
    .where(
      excludeShopId ? and(eq(shops.slug, slug), ne(shops.id, excludeShopId)) : eq(shops.slug, slug),
    )
    .limit(1);

  const [existing] = await query;
  return !existing;
}
