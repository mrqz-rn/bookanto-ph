import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { BookingCalendar } from "@/features/bookings/components/booking-calendar";
import { getBookingCalendarData } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";
import { db } from "@/lib/db";
import { services, shopMembers, users } from "@/lib/db/schema";

export default async function CalendarPage() {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  // Load bookings for current window (+/- 45 days)
  const now = new Date();
  const startWindow = new Date(now.getTime() - 45 * 86_400_000).toISOString();
  const endWindow = new Date(now.getTime() + 45 * 86_400_000).toISOString();

  const [bookings, activeServices, staffRows] = await Promise.all([
    getBookingCalendarData(shop.id, startWindow, endWindow),
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
    <BookingCalendar
      shopId={shop.id}
      initialBookings={bookings}
      activeServices={activeServices}
      shopStaff={shopStaff}
    />
  );
}
