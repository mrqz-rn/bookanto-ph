import "server-only";

import { and, asc, desc, eq, gt, gte, ilike, isNull, lt, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  bookingEvents,
  bookings,
  businessHours,
  closures,
  services,
  shopMembers,
  shops,
  users,
  type BookingStatus,
  type BookingType,
} from "@/lib/db/schema";
import { formatManila, manilaDate, manilaToUtc, manilaWeekday, startOfManilaDay } from "@/lib/time";

import type { CalendarClosure, WeekdayHours } from "./calendar";
import type {
  BookingDetail,
  BookingEventItem,
  BookingListItem,
  RevenueDailyPoint,
  RevenueServiceBreakdown,
  RevenueStaffPerformance,
  ShopRevenueStats,
  TodayDashboardData,
  TodayHours,
  TodayStats,
} from "./constants";
import { parseWalkInGuest } from "./walk-in-notes";

/**
 * Maps raw database joins into a clean BookingListItem object.
 */
function mapBookingListItem(row: {
  booking: typeof bookings.$inferSelect;
  service: { id: string; name: string; durationMin: number; priceCentavos: number | null };
  customer: { id: string; name: string | null; phone: string | null } | null;
  staff: { id: string; name: string | null } | null;
}): BookingListItem {
  const isWalkIn = row.booking.customerId === null;
  let customerName = row.customer?.name || "Customer";
  let customerPhone = row.customer?.phone || null;

  if (isWalkIn) {
    customerName = "Walk-in Guest";
    const guest = parseWalkInGuest(row.booking.notes);
    if (guest?.name) customerName = guest.name;
    if (guest?.phone) customerPhone = guest.phone;
  }

  return {
    id: row.booking.id,
    refCode: row.booking.refCode,
    customerId: row.booking.customerId,
    customerName,
    customerPhone,
    shopId: row.booking.shopId,
    serviceId: row.service.id,
    serviceName: row.service.name,
    serviceDurationMin: row.service.durationMin,
    staffId: row.booking.staffId,
    staffName: row.staff?.name || null,
    startAt: row.booking.startAt.toISOString(),
    endAt: row.booking.endAt ? row.booking.endAt.toISOString() : null,
    status: row.booking.status as BookingStatus,
    address: row.booking.address,
    notes: row.booking.notes,
    quotedPriceCentavos: row.booking.quotedPriceCentavos,
    totalCentavos: row.booking.totalCentavos,
    isWalkIn,
    createdAt: row.booking.createdAt.toISOString(),
    expiresAt: row.booking.expiresAt ? row.booking.expiresAt.toISOString() : null,
    bookingType: row.booking.bookingType as BookingType,
  };
}

/**
 * The shop's opening hours for a Manila date (today by default), or null when
 * none are set for that weekday. A closure overlapping the day sets closedReason.
 */
export async function getShopHoursForDay(
  shopId: string,
  targetDate?: string,
): Promise<TodayHours | null> {
  const dateStr = targetDate || manilaDate(new Date());
  const startOfDay = manilaToUtc(dateStr, "00:00");
  const endOfDay = manilaToUtc(dateStr, "23:59:59.999");

  const [hours, closure] = await Promise.all([
    db
      .select({
        opens: businessHours.opens,
        closes: businessHours.closes,
        breakStart: businessHours.breakStart,
        breakEnd: businessHours.breakEnd,
      })
      .from(businessHours)
      .where(
        and(eq(businessHours.shopId, shopId), eq(businessHours.weekday, manilaWeekday(startOfDay))),
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ reason: closures.reason })
      .from(closures)
      .where(
        and(
          eq(closures.shopId, shopId),
          lt(closures.startsAt, endOfDay),
          gt(closures.endsAt, startOfDay),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!hours) return null;
  const at = (time: string | null) => (time ? manilaToUtc(dateStr, time).toISOString() : null);
  return {
    opensAt: manilaToUtc(dateStr, hours.opens).toISOString(),
    closesAt: manilaToUtc(dateStr, hours.closes).toISOString(),
    breakStartAt: at(hours.breakStart),
    breakEndAt: at(hours.breakEnd),
    closedReason: closure ? (closure.reason?.trim() ?? "") : null,
  };
}

/**
 * Retrieves all data required for the shop's Today view.
 */
export async function getTodayDashboardData(
  shopId: string,
  targetDate?: string,
): Promise<TodayDashboardData> {
  const now = new Date();
  const dateStr = targetDate || manilaDate(now);
  const startOfDay = manilaToUtc(dateStr, "00:00");
  const endOfDay = manilaToUtc(dateStr, "23:59:59.999");

  // Load shop status
  const [shop] = await db
    .select({ id: shops.id, status: shops.status })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  // Load active services for quick walk-ins
  const activeServices = await db
    .select({
      id: services.id,
      name: services.name,
      priceCentavos: services.priceCentavos,
      durationMin: services.durationMin,
    })
    .from(services)
    .where(and(eq(services.shopId, shopId), eq(services.active, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));

  // Load active staff members
  const staffUsers = db
    .$with("staff_users")
    .as(db.select({ id: users.id, name: users.name }).from(users));

  const shopStaff = await db
    .with(staffUsers)
    .select({
      userId: shopMembers.userId,
      role: shopMembers.role,
      name: sql<string>`coalesce(${staffUsers.name}, 'Staff')`,
    })
    .from(shopMembers)
    .leftJoin(staffUsers, eq(staffUsers.id, shopMembers.userId))
    .where(and(eq(shopMembers.shopId, shopId), eq(shopMembers.active, true)))
    .orderBy(asc(shopMembers.role), asc(staffUsers.name));

  // Customer users alias
  const customerUsers = db
    .$with("customer_users")
    .as(db.select({ id: users.id, name: users.name, phone: users.phone }).from(users));

  // Load all bookings for today
  const todayRaw = await db
    .with(customerUsers, staffUsers)
    .select({
      booking: bookings,
      service: {
        id: services.id,
        name: services.name,
        durationMin: services.durationMin,
        priceCentavos: services.priceCentavos,
      },
      customer: {
        id: customerUsers.id,
        name: customerUsers.name,
        phone: customerUsers.phone,
      },
      staff: {
        id: staffUsers.id,
        name: staffUsers.name,
      },
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(customerUsers, eq(customerUsers.id, bookings.customerId))
    .leftJoin(staffUsers, eq(staffUsers.id, bookings.staffId))
    .where(
      and(
        eq(bookings.shopId, shopId),
        gte(bookings.startAt, startOfDay),
        lte(bookings.startAt, endOfDay),
      ),
    )
    .orderBy(asc(bookings.startAt));

  const todayBookings = todayRaw.map(mapBookingListItem);

  // Compute Today's KPIs
  const stats: TodayStats = {
    total: todayBookings.length,
    requested: 0,
    confirmed: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
    walkIns: 0,
    realizedCentavos: 0,
    expectedCentavos: 0,
    totalCentavos: 0,
  };

  for (const b of todayBookings) {
    const amount = b.totalCentavos ?? 0;
    stats.totalCentavos += amount;

    if (b.isWalkIn) stats.walkIns++;

    switch (b.status) {
      case "requested":
        stats.requested++;
        stats.expectedCentavos += amount;
        break;
      case "confirmed":
        stats.confirmed++;
        stats.expectedCentavos += amount;
        break;
      case "completed":
        stats.completed++;
        stats.realizedCentavos += amount;
        break;
      case "no_show":
        stats.noShow++;
        break;
      case "cancelled":
        stats.cancelled++;
        break;
      default:
        break;
    }
  }

  // Pending requests (any unhandled requests, including upcoming)
  const pendingRequests = todayBookings.filter((b) => b.status === "requested");

  return {
    todayDateFormatted: formatManila(startOfDay, "EEEE, MMMM d, yyyy"),
    isAcceptingToday: shop?.status === "active",
    stats,
    todayBookings,
    pendingRequests,
    activeServices,
    shopStaff,
  };
}

/**
 * Retrieves a list of bookings filtered by status, staff, search, and date.
 */
export async function getShopBookings(params: {
  shopId: string;
  status?: string;
  staffId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Only bookings the shop added without a customer account. */
  walkInsOnly?: boolean;
  limit?: number;
}): Promise<BookingListItem[]> {
  const staffUsers = db
    .$with("staff_users")
    .as(db.select({ id: users.id, name: users.name }).from(users));

  const customerUsers = db
    .$with("customer_users")
    .as(db.select({ id: users.id, name: users.name, phone: users.phone }).from(users));

  const conditions = [eq(bookings.shopId, params.shopId)];

  if (params.status && params.status !== "all") {
    conditions.push(eq(bookings.status, params.status as BookingStatus));
  }

  if (params.staffId) {
    conditions.push(eq(bookings.staffId, params.staffId));
  }

  if (params.walkInsOnly) {
    conditions.push(isNull(bookings.customerId));
  }

  if (params.dateFrom) {
    conditions.push(gte(bookings.startAt, new Date(params.dateFrom)));
  }

  if (params.dateTo) {
    conditions.push(lte(bookings.startAt, new Date(params.dateTo)));
  }

  if (params.search?.trim()) {
    const query = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(bookings.refCode, query),
        ilike(bookings.notes, query),
        ilike(services.name, query),
        ilike(customerUsers.name, query),
      )!,
    );
  }

  const rows = await db
    .with(customerUsers, staffUsers)
    .select({
      booking: bookings,
      service: {
        id: services.id,
        name: services.name,
        durationMin: services.durationMin,
        priceCentavos: services.priceCentavos,
      },
      customer: {
        id: customerUsers.id,
        name: customerUsers.name,
        phone: customerUsers.phone,
      },
      staff: {
        id: staffUsers.id,
        name: staffUsers.name,
      },
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(customerUsers, eq(customerUsers.id, bookings.customerId))
    .leftJoin(staffUsers, eq(staffUsers.id, bookings.staffId))
    .where(and(...conditions))
    .orderBy(desc(bookings.startAt))
    .limit(params.limit ?? 100);

  return rows.map(mapBookingListItem);
}

/**
 * Retrieves calendar booking entries within a given start and end range.
 */
export async function getBookingCalendarData(
  shopId: string,
  startDate: string,
  endDate: string,
  staffId?: string,
): Promise<BookingListItem[]> {
  const conditions = [
    eq(bookings.shopId, shopId),
    gte(bookings.startAt, new Date(startDate)),
    lte(bookings.startAt, new Date(endDate)),
  ];

  if (staffId && staffId !== "all") {
    conditions.push(eq(bookings.staffId, staffId));
  }

  const staffUsers = db
    .$with("staff_users")
    .as(db.select({ id: users.id, name: users.name }).from(users));

  const customerUsers = db
    .$with("customer_users")
    .as(db.select({ id: users.id, name: users.name, phone: users.phone }).from(users));

  const rows = await db
    .with(customerUsers, staffUsers)
    .select({
      booking: bookings,
      service: {
        id: services.id,
        name: services.name,
        durationMin: services.durationMin,
        priceCentavos: services.priceCentavos,
      },
      customer: {
        id: customerUsers.id,
        name: customerUsers.name,
        phone: customerUsers.phone,
      },
      staff: {
        id: staffUsers.id,
        name: staffUsers.name,
      },
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(customerUsers, eq(customerUsers.id, bookings.customerId))
    .leftJoin(staffUsers, eq(staffUsers.id, bookings.staffId))
    .where(and(...conditions))
    .orderBy(asc(bookings.startAt));

  return rows.map(mapBookingListItem);
}

/**
 * Retrieves full details for a single booking including its audit events timeline.
 */
export async function getBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  const staffUsers = db
    .$with("staff_users")
    .as(db.select({ id: users.id, name: users.name }).from(users));

  const customerUsers = db
    .$with("customer_users")
    .as(db.select({ id: users.id, name: users.name, phone: users.phone }).from(users));

  const [row] = await db
    .with(customerUsers, staffUsers)
    .select({
      booking: bookings,
      service: {
        id: services.id,
        name: services.name,
        durationMin: services.durationMin,
        priceCentavos: services.priceCentavos,
      },
      customer: {
        id: customerUsers.id,
        name: customerUsers.name,
        phone: customerUsers.phone,
      },
      staff: {
        id: staffUsers.id,
        name: staffUsers.name,
      },
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(customerUsers, eq(customerUsers.id, bookings.customerId))
    .leftJoin(staffUsers, eq(staffUsers.id, bookings.staffId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return null;

  const base = mapBookingListItem(row);

  // Fetch events
  const actorUsers = db
    .$with("actor_users")
    .as(db.select({ id: users.id, name: users.name }).from(users));

  const rawEvents = await db
    .with(actorUsers)
    .select({
      id: bookingEvents.id,
      bookingId: bookingEvents.bookingId,
      fromStatus: bookingEvents.fromStatus,
      toStatus: bookingEvents.toStatus,
      actorId: bookingEvents.actorId,
      actorName: actorUsers.name,
      reason: bookingEvents.reason,
      createdAt: bookingEvents.createdAt,
    })
    .from(bookingEvents)
    .leftJoin(actorUsers, eq(actorUsers.id, bookingEvents.actorId))
    .where(eq(bookingEvents.bookingId, bookingId))
    .orderBy(asc(bookingEvents.createdAt));

  const events: BookingEventItem[] = rawEvents.map((e) => ({
    id: e.id,
    bookingId: e.bookingId,
    fromStatus: e.fromStatus as BookingStatus | null,
    toStatus: e.toStatus as BookingStatus,
    actorId: e.actorId,
    actorName: e.actorName || "System",
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    ...base,
    events,
  };
}

/**
 * Computes revenue analytics, simple stats, daily trends, and breakdowns.
 */
export async function getShopRevenueStats(
  shopId: string,
  period: "today" | "7d" | "30d" | "month" | "year" | "all" = "30d",
): Promise<ShopRevenueStats> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  let periodLabel = "Last 30 Days";

  switch (period) {
    case "today": {
      startDate = startOfManilaDay(now);
      const todayStr = manilaDate(now);
      endDate = manilaToUtc(todayStr, "23:59:59.999");
      periodLabel = "Today";
      break;
    }
    case "7d": {
      startDate = new Date(now.getTime() - 7 * 86_400_000);
      endDate = now;
      periodLabel = "Last 7 Days";
      break;
    }
    case "30d": {
      startDate = new Date(now.getTime() - 30 * 86_400_000);
      endDate = now;
      periodLabel = "Last 30 Days";
      break;
    }
    case "month": {
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthStr = String(month + 1).padStart(2, "0");
      startDate = manilaToUtc(`${year}-${monthStr}-01`, "00:00");
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      endDate = manilaToUtc(
        `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`,
        "23:59:59.999",
      );
      periodLabel = "This Month";
      break;
    }
    case "year": {
      const year = now.getFullYear();
      startDate = manilaToUtc(`${year}-01-01`, "00:00");
      endDate = manilaToUtc(`${year}-12-31`, "23:59:59.999");
      periodLabel = "This Year";
      break;
    }
    case "all":
    default: {
      startDate = new Date(0); // All time
      endDate = new Date(now.getTime() + 86_400_000);
      periodLabel = "All Time";
      break;
    }
  }

  // Query all bookings in period
  const staffUsers = db
    .$with("staff_users")
    .as(db.select({ id: users.id, name: users.name }).from(users));

  const rows = await db
    .with(staffUsers)
    .select({
      id: bookings.id,
      status: bookings.status,
      startAt: bookings.startAt,
      totalCentavos: bookings.totalCentavos,
      isWalkIn: isNull(bookings.customerId),
      serviceId: services.id,
      serviceName: services.name,
      staffId: bookings.staffId,
      staffName: staffUsers.name,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(staffUsers, eq(staffUsers.id, bookings.staffId))
    .where(
      and(
        eq(bookings.shopId, shopId),
        gte(bookings.startAt, startDate),
        lte(bookings.startAt, endDate),
      ),
    )
    .orderBy(asc(bookings.startAt));

  let grossCentavos = 0;
  let completedCount = 0;
  let noShowCount = 0;
  let walkInCount = 0;
  const totalBookings = rows.length;

  // Daily map
  const dailyMap = new Map<string, { bookingsCount: number; grossCentavos: number }>();
  // Services map
  const serviceMap = new Map<
    string,
    { name: string; bookingsCount: number; grossCentavos: number }
  >();
  // Staff map
  const staffMap = new Map<
    string,
    { name: string; assignedCount: number; completedCount: number; grossCentavos: number }
  >();

  for (const r of rows) {
    const dateKey = manilaDate(r.startAt);
    const amount = r.totalCentavos ?? 0;

    if (r.isWalkIn) walkInCount++;
    if (r.status === "no_show") noShowCount++;

    if (r.status === "completed") {
      completedCount++;
      grossCentavos += amount;

      // Add to daily
      const curDaily = dailyMap.get(dateKey) || { bookingsCount: 0, grossCentavos: 0 };
      curDaily.bookingsCount++;
      curDaily.grossCentavos += amount;
      dailyMap.set(dateKey, curDaily);

      // Add to service
      const curService = serviceMap.get(r.serviceId) || {
        name: r.serviceName,
        bookingsCount: 0,
        grossCentavos: 0,
      };
      curService.bookingsCount++;
      curService.grossCentavos += amount;
      serviceMap.set(r.serviceId, curService);

      // Add to staff
      if (r.staffId) {
        const curStaff = staffMap.get(r.staffId) || {
          name: r.staffName || "Staff",
          assignedCount: 0,
          completedCount: 0,
          grossCentavos: 0,
        };
        curStaff.completedCount++;
        curStaff.grossCentavos += amount;
        staffMap.set(r.staffId, curStaff);
      }
    }

    if (r.staffId) {
      const curStaff = staffMap.get(r.staffId) || {
        name: r.staffName || "Staff",
        assignedCount: 0,
        completedCount: 0,
        grossCentavos: 0,
      };
      curStaff.assignedCount++;
      staffMap.set(r.staffId, curStaff);
    }
  }

  // Build daily trend
  const dailyTrend: RevenueDailyPoint[] = Array.from(dailyMap.entries())
    .map(([date, val]) => ({
      date,
      label: formatManila(manilaToUtc(date), "MMM d"),
      bookingsCount: val.bookingsCount,
      grossCentavos: val.grossCentavos,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build top services
  const topServices: RevenueServiceBreakdown[] = Array.from(serviceMap.entries())
    .map(([serviceId, val]) => ({
      serviceId,
      serviceName: val.name,
      bookingsCount: val.bookingsCount,
      grossCentavos: val.grossCentavos,
      sharePercentage:
        grossCentavos > 0 ? Math.round((val.grossCentavos / grossCentavos) * 100) : 0,
    }))
    .sort((a, b) => b.grossCentavos - a.grossCentavos);

  // Build staff performance
  const staffPerformance: RevenueStaffPerformance[] = Array.from(staffMap.entries())
    .map(([staffId, val]) => ({
      staffId,
      staffName: val.name,
      role: "staff" as const,
      assignedCount: val.assignedCount,
      completedCount: val.completedCount,
      grossCentavos: val.grossCentavos,
    }))
    .sort((a, b) => b.grossCentavos - a.grossCentavos);

  const averageCentavos = completedCount > 0 ? Math.round(grossCentavos / completedCount) : 0;
  const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;
  const noShowRate = totalBookings > 0 ? Math.round((noShowCount / totalBookings) * 100) : 0;
  const walkInRate = totalBookings > 0 ? Math.round((walkInCount / totalBookings) * 100) : 0;

  return {
    period,
    periodLabel,
    grossCentavos,
    completedCount,
    totalBookings,
    averageCentavos,
    noShowRate,
    completionRate,
    walkInRate,
    dailyTrend,
    topServices,
    staffPerformance,
  };
}

/**
 * Retrieves walk-in bookings specifically.
 */
/**
 * The shop's latest walk-ins, newest first. Filtered in SQL: filtering after
 * the limit dropped walk-ins whenever online bookings filled the page.
 */
export async function getShopWalkIns(shopId: string, limit = 100): Promise<BookingListItem[]> {
  return getShopBookings({ shopId, walkInsOnly: true, limit });
}

/**
 * The shop's weekly opening hours and the closures that touch a window, for the
 * calendar's shading. Hours are Manila wall-clock times ("09:00:00").
 */
export async function getCalendarSchedule(
  shopId: string,
  startIso: string,
  endIso: string,
): Promise<{ hours: WeekdayHours[]; closures: CalendarClosure[] }> {
  const [hours, closureRows] = await Promise.all([
    db
      .select({
        weekday: businessHours.weekday,
        opens: businessHours.opens,
        closes: businessHours.closes,
        breakStart: businessHours.breakStart,
        breakEnd: businessHours.breakEnd,
      })
      .from(businessHours)
      .where(eq(businessHours.shopId, shopId))
      .orderBy(asc(businessHours.weekday)),
    db
      .select({ startsAt: closures.startsAt, endsAt: closures.endsAt, reason: closures.reason })
      .from(closures)
      .where(
        and(
          eq(closures.shopId, shopId),
          lt(closures.startsAt, new Date(endIso)),
          gt(closures.endsAt, new Date(startIso)),
        ),
      )
      .orderBy(asc(closures.startsAt)),
  ]);

  return {
    hours,
    closures: closureRows.map((c) => ({
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      reason: c.reason?.trim() || null,
    })),
  };
}
