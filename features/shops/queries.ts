import "server-only";

import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  barangays,
  bookings,
  businessHours,
  categories,
  cities,
  media,
  services,
  shopCategories,
  shopMembers,
  shops,
  staffSchedules,
  users,
} from "@/lib/db/schema";
import { mediaUrl } from "@/lib/media";

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

export type ShopTeamMember = {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "owner" | "manager" | "staff";
  active: boolean;
  usesShopHours: boolean;
  assignedCount: number;
  completedCount: number;
  grossCentavos: number;
  joinedAt: string;
};

/**
 * Returns all team members of a shop with profile info, scheduling status, and performance stats.
 */
export async function getShopTeamMembers(shopId: string): Promise<ShopTeamMember[]> {
  const members = await db
    .select({
      id: shopMembers.id,
      userId: shopMembers.userId,
      role: shopMembers.role,
      active: shopMembers.active,
      createdAt: shopMembers.createdAt,
      name: users.name,
      phone: users.phone,
      email: users.email,
      usesShopHours: staffSchedules.usesShopHours,
    })
    .from(shopMembers)
    .innerJoin(users, eq(users.id, shopMembers.userId))
    .leftJoin(
      staffSchedules,
      and(
        eq(staffSchedules.shopId, shopMembers.shopId),
        eq(staffSchedules.userId, shopMembers.userId),
      ),
    )
    .where(eq(shopMembers.shopId, shopId))
    .orderBy(
      sql`case ${shopMembers.role} when 'owner' then 0 when 'manager' then 1 else 2 end`,
      asc(users.name),
    );

  // Load bookings stats for these members
  const memberStats = await db
    .select({
      staffId: bookings.staffId,
      assignedCount: sql<number>`count(*)::int`,
      completedCount: sql<number>`count(case when ${bookings.status} = 'completed' then 1 end)::int`,
      grossCentavos: sql<number>`coalesce(sum(case when ${bookings.status} = 'completed' then ${bookings.totalCentavos} else 0 end), 0)::int`,
    })
    .from(bookings)
    .where(and(eq(bookings.shopId, shopId), sql`${bookings.staffId} is not null`))
    .groupBy(bookings.staffId);

  const statsMap = new Map<
    string,
    { assignedCount: number; completedCount: number; grossCentavos: number }
  >();
  for (const s of memberStats) {
    if (s.staffId) {
      statsMap.set(s.staffId, {
        assignedCount: s.assignedCount,
        completedCount: s.completedCount,
        grossCentavos: s.grossCentavos,
      });
    }
  }

  return members.map((m) => {
    const stats = statsMap.get(m.userId) || {
      assignedCount: 0,
      completedCount: 0,
      grossCentavos: 0,
    };
    return {
      id: m.id,
      userId: m.userId,
      name: m.name || "Team Member",
      phone: m.phone,
      email: m.email,
      role: m.role as "owner" | "manager" | "staff",
      active: m.active,
      usesShopHours: m.usesShopHours ?? true,
      assignedCount: stats.assignedCount,
      completedCount: stats.completedCount,
      grossCentavos: stats.grossCentavos,
      joinedAt: m.createdAt.toISOString(),
    };
  });
}

/**
 * Loads public shop profile data, categories, hours, photos, and active services by slug.
 */
export async function getPublicShopBySlug(slug: string) {
  const [shop] = await db
    .select({
      id: shops.id,
      slug: shops.slug,
      name: shops.name,
      description: shops.description,
      address: shops.address,
      phone: shops.phone,
      status: shops.status,
      verifiedAt: shops.verifiedAt,
      ratingAvg: shops.ratingAvg,
      ratingCount: shops.ratingCount,
      cityName: cities.name,
      barangayName: barangays.name,
    })
    .from(shops)
    .leftJoin(cities, eq(cities.id, shops.cityId))
    .leftJoin(barangays, eq(barangays.id, shops.barangayId))
    .where(eq(shops.slug, slug))
    .limit(1);

  if (!shop) return null;

  const [shopCats, hours, photos, activeServices] = await Promise.all([
    db
      .select({
        categoryId: shopCategories.categoryId,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
      })
      .from(shopCategories)
      .innerJoin(categories, eq(shopCategories.categoryId, categories.id))
      .where(eq(shopCategories.shopId, shop.id)),
    db
      .select()
      .from(businessHours)
      .where(eq(businessHours.shopId, shop.id))
      .orderBy(asc(businessHours.weekday)),
    db
      .select()
      .from(media)
      .where(and(eq(media.ownerType, "shop"), eq(media.ownerId, shop.id), eq(media.kind, "photo")))
      .orderBy(asc(media.sortOrder)),
    db
      .select()
      .from(services)
      .where(and(eq(services.shopId, shop.id), eq(services.active, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
  ]);

  return {
    shop,
    categories: shopCats,
    hours,
    photos: photos.map((p) => ({ ...p, url: mediaUrl(p.path) })),
    services: activeServices,
  };
}
