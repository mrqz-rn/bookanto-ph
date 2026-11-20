import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { WalkInsManager } from "@/features/bookings/components/walk-ins-manager";
import { getShopWalkIns } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";
import { db } from "@/lib/db";
import { services, shopMembers, users } from "@/lib/db/schema";

export default async function WalkInsPage() {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  const [walkIns, activeServices, staffRows] = await Promise.all([
    getShopWalkIns(shop.id),
    db
      .select({
        id: services.id,
        name: services.name,
        priceCentavos: services.priceCentavos,
        durationMin: services.durationMin,
      })
      .from(services)
      .where(and(eq(services.shopId, shop.id), eq(services.active, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db
      .select({
        userId: shopMembers.userId,
        role: shopMembers.role,
        name: users.name,
      })
      .from(shopMembers)
      .innerJoin(users, eq(users.id, shopMembers.userId))
      .where(and(eq(shopMembers.shopId, shop.id), eq(shopMembers.active, true)))
      .orderBy(asc(users.name)),
  ]);

  const shopStaff = staffRows.map((s) => ({
    userId: s.userId,
    name: s.name || "Staff",
    role: s.role,
  }));

  return (
    <WalkInsManager
      shopId={shop.id}
      initialWalkIns={walkIns}
      activeServices={activeServices}
      shopStaff={shopStaff}
      nowIso={new Date().toISOString()}
    />
  );
}
