import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import {
  CALENDAR_VIEWS,
  isDateKey,
  loadWindow,
  windowInstants,
  type CalendarView,
} from "@/features/bookings/calendar";
import { BookingCalendar } from "@/features/bookings/components/booking-calendar";
import { getBookingCalendarData, getCalendarSchedule } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";
import { db } from "@/lib/db";
import { services, shopMembers, users } from "@/lib/db/schema";
import { manilaDate } from "@/lib/time";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const view: CalendarView = CALENDAR_VIEWS.includes(params.view as CalendarView)
    ? (params.view as CalendarView)
    : "week";
  const renderedAt = new Date();
  const date = isDateKey(params.date) ? params.date : manilaDate(renderedAt);

  // Three months of bookings around the chosen day, so the arrows move without a reload.
  const loaded = loadWindow(date);
  const { startIso, endIso } = windowInstants(loaded);

  const [bookings, schedule, activeServices, staffRows] = await Promise.all([
    getBookingCalendarData(shop.id, startIso, endIso),
    getCalendarSchedule(shop.id, startIso, endIso),
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
      // Loading another window starts the calendar fresh; a refresh keeps its filters.
      key={loaded.from}
      shopId={shop.id}
      initialBookings={bookings}
      activeServices={activeServices}
      shopStaff={shopStaff}
      initialView={view}
      initialDate={date}
      loaded={loaded}
      hours={schedule.hours}
      closures={schedule.closures}
      renderedAt={renderedAt.toISOString()}
    />
  );
}
