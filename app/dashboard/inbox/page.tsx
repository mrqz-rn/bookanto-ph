import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { BookingInbox } from "@/features/bookings/components/booking-inbox";
import { getShopBookings } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";
import { db } from "@/lib/db";
import { shopMembers, users } from "@/lib/db/schema";

export default async function InboxPage() {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  const [bookings, staffRows] = await Promise.all([
    getShopBookings({ shopId: shop.id }),
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

  return <BookingInbox shopId={shop.id} initialBookings={bookings} shopStaff={shopStaff} />;
}
