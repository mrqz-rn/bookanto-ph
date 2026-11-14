import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { barangays, cities, userAddresses, users } from "@/lib/db/schema";

export type SavedAddressItem = {
  id: string;
  userId: string;
  label: string;
  recipientName: string | null;
  phone: string | null;
  streetAddress: string;
  cityId: string | null;
  cityName: string | null;
  barangayId: string | null;
  barangayName: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
};

export type CityOption = {
  id: string;
  name: string;
  slug: string;
  barangays: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

/**
 * Returns the current user's profile from the database.
 */
export async function getUserProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      platformRole: users.platformRole,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
}

/**
 * Returns all saved addresses for a customer, default first.
 */
export async function getSavedAddresses(userId: string): Promise<SavedAddressItem[]> {
  const rows = await db
    .select({
      id: userAddresses.id,
      userId: userAddresses.userId,
      label: userAddresses.label,
      recipientName: userAddresses.recipientName,
      phone: userAddresses.phone,
      streetAddress: userAddresses.streetAddress,
      cityId: userAddresses.cityId,
      cityName: cities.name,
      barangayId: userAddresses.barangayId,
      barangayName: barangays.name,
      notes: userAddresses.notes,
      isDefault: userAddresses.isDefault,
      createdAt: userAddresses.createdAt,
    })
    .from(userAddresses)
    .leftJoin(cities, eq(userAddresses.cityId, cities.id))
    .leftJoin(barangays, eq(userAddresses.barangayId, barangays.id))
    .where(eq(userAddresses.userId, userId))
    .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));

  return rows;
}

/**
 * Returns active cities and their barangays for the address selector dropdowns.
 */
export async function getCitiesWithBarangays(): Promise<CityOption[]> {
  const allCities = await db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
    })
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(cities.name);

  const allBarangays = await db
    .select({
      id: barangays.id,
      cityId: barangays.cityId,
      name: barangays.name,
      slug: barangays.slug,
    })
    .from(barangays)
    .where(eq(barangays.isActive, true))
    .orderBy(barangays.name);

  return allCities.map((city) => ({
    id: city.id,
    name: city.name,
    slug: city.slug,
    barangays: allBarangays
      .filter((b) => b.cityId === city.id)
      .map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
  }));
}
