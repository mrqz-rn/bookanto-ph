import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  categories,
  media,
  memberships,
  packageItems,
  packages,
  serviceAddons,
  services,
  shopCategories,
} from "@/lib/db/schema";

/**
 * Returns all services for a shop, complete with category info, photos, and add-ons.
 */
export async function getShopServices(shopId: string) {
  const shopServices = await db
    .select({
      id: services.id,
      shopId: services.shopId,
      categoryId: services.categoryId,
      categoryName: categories.name,
      name: services.name,
      description: services.description,
      priceType: services.priceType,
      priceCentavos: services.priceCentavos,
      durationMin: services.durationMin,
      bookingType: services.bookingType,
      capacity: services.capacity,
      bufferMin: services.bufferMin,
      active: services.active,
      sortOrder: services.sortOrder,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .leftJoin(categories, eq(services.categoryId, categories.id))
    .where(eq(services.shopId, shopId))
    .orderBy(asc(services.sortOrder), asc(services.name));

  if (shopServices.length === 0) return [];

  const serviceIds = shopServices.map((s) => s.id);

  // Fetch photos for these services
  const photos = await db
    .select()
    .from(media)
    .where(
      and(
        eq(media.ownerType, "service"),
        inArray(media.ownerId, serviceIds),
        eq(media.kind, "photo"),
      ),
    )
    .orderBy(asc(media.sortOrder));

  // Fetch add-ons for these services
  const addons = await db
    .select()
    .from(serviceAddons)
    .where(inArray(serviceAddons.serviceId, serviceIds))
    .orderBy(asc(serviceAddons.sortOrder), asc(serviceAddons.name));

  return shopServices.map((svc) => ({
    ...svc,
    photos: photos.filter((p) => p.ownerId === svc.id),
    addons: addons.filter((a) => a.serviceId === svc.id),
  }));
}

/**
 * Returns all packages bundled by a shop with their included service items.
 */
export async function getShopPackages(shopId: string) {
  const allPackages = await db
    .select()
    .from(packages)
    .where(eq(packages.shopId, shopId))
    .orderBy(asc(packages.sortOrder), asc(packages.name));

  if (allPackages.length === 0) return [];

  const packageIds = allPackages.map((p) => p.id);

  const items = await db
    .select({
      id: packageItems.id,
      packageId: packageItems.packageId,
      serviceId: packageItems.serviceId,
      serviceName: services.name,
      servicePriceCentavos: services.priceCentavos,
      durationMin: services.durationMin,
      quantity: packageItems.quantity,
    })
    .from(packageItems)
    .innerJoin(services, eq(packageItems.serviceId, services.id))
    .where(inArray(packageItems.packageId, packageIds));

  return allPackages.map((pkg) => ({
    ...pkg,
    items: items.filter((item) => item.packageId === pkg.id),
  }));
}

/**
 * Returns all membership plans / session passes for a shop.
 */
export async function getShopMemberships(shopId: string) {
  return db
    .select()
    .from(memberships)
    .where(eq(memberships.shopId, shopId))
    .orderBy(asc(memberships.sortOrder), asc(memberships.name));
}

/**
 * Returns categories enabled for this shop.
 */
export async function getShopCategories(shopId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      defaultBookingType: categories.defaultBookingType,
    })
    .from(shopCategories)
    .innerJoin(categories, eq(shopCategories.categoryId, categories.id))
    .where(eq(shopCategories.shopId, shopId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}
