import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  announcements,
  auditLog,
  barangays,
  bookingEvents,
  bookings,
  businessHours,
  categories,
  cities,
  fraudSignals,
  media,
  messages,
  reports,
  reviews,
  services,
  shopCategories,
  shops,
  userAddresses,
  users,
} from "@/lib/db/schema";
import type {
  AnnouncementAudience,
  BookingStatus,
  FraudSeverity,
  FraudStatus,
  FraudTargetType,
  PlatformRole,
  ReportStatus,
  ShopStatus,
  UserStatus,
} from "@/lib/db/schema/enums";

import { DEFAULT_PAGE_SIZE } from "./constants";

/**
 * Overview statistics and urgent action queues for the admin dashboard.
 */
export async function getAdminOverviewStats() {
  const [
    [pendingShops],
    [activeShops],
    [totalUsers],
    [totalBookings],
    [openReports],
    [activeFraud],
    [activeAnnounce],
  ] = await Promise.all([
    db.select({ count: count() }).from(shops).where(eq(shops.status, "pending")),
    db.select({ count: count() }).from(shops).where(eq(shops.status, "active")),
    db.select({ count: count() }).from(users).where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(bookings),
    db.select({ count: count() }).from(reports).where(eq(reports.status, "open")),
    db.select({ count: count() }).from(fraudSignals).where(eq(fraudSignals.status, "active")),
    db.select({ count: count() }).from(announcements).where(eq(announcements.isActive, true)),
  ]);

  const recentPending = await db
    .select({
      id: shops.id,
      name: shops.name,
      slug: shops.slug,
      status: shops.status,
      createdAt: shops.createdAt,
      ownerName: users.name,
      ownerPhone: users.phone,
    })
    .from(shops)
    .innerJoin(users, eq(shops.ownerId, users.id))
    .where(eq(shops.status, "pending"))
    .orderBy(desc(shops.createdAt))
    .limit(5);

  const recentReports = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      status: reports.status,
      bookingId: reports.bookingId,
      reviewId: reports.reviewId,
      createdAt: reports.createdAt,
      reporterName: users.name,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
    .limit(5);

  const recentSignals = await db
    .select({
      id: fraudSignals.id,
      targetType: fraudSignals.targetType,
      targetId: fraudSignals.targetId,
      signalType: fraudSignals.signalType,
      severity: fraudSignals.severity,
      score: fraudSignals.score,
      status: fraudSignals.status,
      createdAt: fraudSignals.createdAt,
    })
    .from(fraudSignals)
    .where(eq(fraudSignals.status, "active"))
    .orderBy(desc(fraudSignals.score), desc(fraudSignals.createdAt))
    .limit(5);

  const recentAudit = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      createdAt: auditLog.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(8);

  return {
    pendingShopsCount: pendingShops?.count ?? 0,
    activeShopsCount: activeShops?.count ?? 0,
    totalUsersCount: totalUsers?.count ?? 0,
    totalBookingsCount: totalBookings?.count ?? 0,
    openReportsCount: openReports?.count ?? 0,
    activeFraudSignalsCount: activeFraud?.count ?? 0,
    activeAnnouncementsCount: activeAnnounce?.count ?? 0,
    recentPending,
    recentReports,
    recentSignals,
    recentAudit,
  };
}

/**
 * Lists shops with filtering by status and text search.
 */
export async function getAdminShops(params: {
  status?: ShopStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;

  const conditions = [];
  if (params.status) {
    conditions.push(eq(shops.status, params.status));
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(ilike(shops.name, q), ilike(shops.slug, q), ilike(shops.phone, q), ilike(users.name, q)),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(shops)
    .innerJoin(users, eq(shops.ownerId, users.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: shops.id,
      name: shops.name,
      slug: shops.slug,
      status: shops.status,
      phone: shops.phone,
      ratingAvg: shops.ratingAvg,
      ratingCount: shops.ratingCount,
      verifiedAt: shops.verifiedAt,
      createdAt: shops.createdAt,
      cityName: cities.name,
      barangayName: barangays.name,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerPhone: users.phone,
    })
    .from(shops)
    .innerJoin(users, eq(shops.ownerId, users.id))
    .leftJoin(cities, eq(shops.cityId, cities.id))
    .leftJoin(barangays, eq(shops.barangayId, barangays.id))
    .where(whereClause)
    .orderBy(desc(shops.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch document counts for these shops
  const shopIds = rows.map((r) => r.id);
  const docCounts =
    shopIds.length > 0
      ? await db
          .select({
            shopId: media.ownerId,
            count: count(),
          })
          .from(media)
          .where(
            and(
              eq(media.ownerType, "shop"),
              eq(media.kind, "document"),
              inArray(media.ownerId, shopIds),
            ),
          )
          .groupBy(media.ownerId)
      : [];

  const docCountMap = new Map(docCounts.map((d) => [d.shopId, d.count]));

  return {
    total: totalResult?.count ?? 0,
    shops: rows.map((r) => ({
      ...r,
      documentsCount: docCountMap.get(r.id) ?? 0,
    })),
  };
}

/**
 * Fetches a single shop's full profile for admin verification and review.
 */
export async function getAdminShopById(shopId: string) {
  const [shop] = await db
    .select({
      id: shops.id,
      name: shops.name,
      slug: shops.slug,
      description: shops.description,
      address: shops.address,
      phone: shops.phone,
      status: shops.status,
      verifiedAt: shops.verifiedAt,
      ratingAvg: shops.ratingAvg,
      ratingCount: shops.ratingCount,
      createdAt: shops.createdAt,
      updatedAt: shops.updatedAt,
      cityId: shops.cityId,
      cityName: cities.name,
      barangayId: shops.barangayId,
      barangayName: barangays.name,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerPhone: users.phone,
      ownerStatus: users.status,
    })
    .from(shops)
    .innerJoin(users, eq(shops.ownerId, users.id))
    .leftJoin(cities, eq(shops.cityId, cities.id))
    .leftJoin(barangays, eq(shops.barangayId, barangays.id))
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) return null;

  const [shopMediaList, shopCategoriesList, servicesList, hoursList, recentBookings, auditLogs] =
    await Promise.all([
      db
        .select()
        .from(media)
        .where(and(eq(media.ownerType, "shop"), eq(media.ownerId, shopId)))
        .orderBy(asc(media.sortOrder)),
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          icon: categories.icon,
        })
        .from(shopCategories)
        .innerJoin(categories, eq(shopCategories.categoryId, categories.id))
        .where(eq(shopCategories.shopId, shopId)),
      db
        .select({
          id: services.id,
          name: services.name,
          priceType: services.priceType,
          priceCentavos: services.priceCentavos,
          durationMin: services.durationMin,
          bookingType: services.bookingType,
          active: services.active,
        })
        .from(services)
        .where(eq(services.shopId, shopId))
        .orderBy(asc(services.sortOrder)),
      db
        .select()
        .from(businessHours)
        .where(eq(businessHours.shopId, shopId))
        .orderBy(asc(businessHours.weekday)),
      db
        .select({
          id: bookings.id,
          refCode: bookings.refCode,
          status: bookings.status,
          totalCentavos: bookings.totalCentavos,
          startAt: bookings.startAt,
          createdAt: bookings.createdAt,
          customerName: users.name,
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.customerId, users.id))
        .where(eq(bookings.shopId, shopId))
        .orderBy(desc(bookings.createdAt))
        .limit(10),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          data: auditLog.data,
          createdAt: auditLog.createdAt,
          actorName: users.name,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .where(and(eq(auditLog.targetType, "shop"), eq(auditLog.targetId, shopId)))
        .orderBy(desc(auditLog.createdAt))
        .limit(10),
    ]);

  const documents = shopMediaList.filter((m) => m.kind === "document");
  const photos = shopMediaList.filter((m) => m.kind === "photo");

  return {
    ...shop,
    categories: shopCategoriesList,
    services: servicesList,
    businessHours: hoursList,
    documents,
    photos,
    recentBookings,
    auditLogs,
  };
}

/**
 * Lists all categories with shop counts.
 */
export async function getAdminCategories() {
  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      name: categories.name,
      icon: categories.icon,
      defaultBookingType: categories.defaultBookingType,
      sortOrder: categories.sortOrder,
      active: categories.active,
      createdAt: categories.createdAt,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const shopCountPerCategory = await db
    .select({
      categoryId: shopCategories.categoryId,
      count: count(),
    })
    .from(shopCategories)
    .groupBy(shopCategories.categoryId);

  const countMap = new Map(shopCountPerCategory.map((c) => [c.categoryId, c.count]));

  return rows.map((cat) => ({
    ...cat,
    shopsCount: countMap.get(cat.id) ?? 0,
  }));
}

/**
 * Lists platform users with filtering by role and status, and text search.
 */
export async function getAdminUsers(params: {
  role?: PlatformRole;
  status?: UserStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;

  const conditions = [isNull(users.deletedAt)];
  if (params.role) {
    conditions.push(eq(users.platformRole, params.role));
  }
  if (params.status) {
    conditions.push(eq(users.status, params.status));
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    const searchCond = or(ilike(users.name, q), ilike(users.email, q), ilike(users.phone, q));
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const whereClause = and(...conditions);

  const [totalResult] = await db.select({ count: count() }).from(users).where(whereClause);

  const rows = await db
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
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = rows.map((u) => u.id);

  if (userIds.length === 0) {
    return { total: 0, users: [] };
  }

  const [bookingCounts, ownedShops] = await Promise.all([
    db
      .select({
        customerId: bookings.customerId,
        count: count(),
      })
      .from(bookings)
      .where(inArray(bookings.customerId, userIds))
      .groupBy(bookings.customerId),
    db
      .select({
        ownerId: shops.ownerId,
        shopName: shops.name,
      })
      .from(shops)
      .where(inArray(shops.ownerId, userIds)),
  ]);

  const bookingCountMap = new Map(bookingCounts.map((b) => [b.customerId, b.count]));
  const ownedShopsMap = new Map<string, string[]>();
  for (const s of ownedShops) {
    const current = ownedShopsMap.get(s.ownerId) ?? [];
    current.push(s.shopName);
    ownedShopsMap.set(s.ownerId, current);
  }

  return {
    total: totalResult?.count ?? 0,
    users: rows.map((u) => ({
      ...u,
      bookingsCount: bookingCountMap.get(u.id) ?? 0,
      ownedShops: ownedShopsMap.get(u.id) ?? [],
    })),
  };
}

/**
 * Fetches a single user with owned shops, recent bookings, and audit history.
 */
export async function getAdminUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return null;

  const [addresses, userShops, userBookings, auditLogs, userFraudSignals] = await Promise.all([
    db.select().from(userAddresses).where(eq(userAddresses.userId, userId)),
    db
      .select({
        id: shops.id,
        name: shops.name,
        slug: shops.slug,
        status: shops.status,
      })
      .from(shops)
      .where(eq(shops.ownerId, userId)),
    db
      .select({
        id: bookings.id,
        refCode: bookings.refCode,
        status: bookings.status,
        totalCentavos: bookings.totalCentavos,
        startAt: bookings.startAt,
        createdAt: bookings.createdAt,
        shopName: shops.name,
        serviceName: services.name,
      })
      .from(bookings)
      .innerJoin(shops, eq(bookings.shopId, shops.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.customerId, userId))
      .orderBy(desc(bookings.createdAt))
      .limit(15),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        data: auditLog.data,
        createdAt: auditLog.createdAt,
        actorName: users.name,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .where(and(eq(auditLog.targetType, "user"), eq(auditLog.targetId, userId)))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
    db
      .select()
      .from(fraudSignals)
      .where(and(eq(fraudSignals.targetType, "user"), eq(fraudSignals.targetId, userId)))
      .orderBy(desc(fraudSignals.createdAt)),
  ]);

  return {
    ...user,
    addresses,
    shops: userShops,
    recentBookings: userBookings,
    auditLogs,
    fraudSignals: userFraudSignals,
  };
}

/**
 * Lists all platform bookings with status filtering and text search.
 */
export async function getAdminBookings(params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;

  const conditions = [];
  if (params.status && params.status !== "all") {
    conditions.push(eq(bookings.status, params.status as BookingStatus));
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(or(ilike(bookings.refCode, q), ilike(users.name, q), ilike(shops.name, q)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(shops, eq(bookings.shopId, shops.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      status: bookings.status,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      totalCentavos: bookings.totalCentavos,
      quotedPriceCentavos: bookings.quotedPriceCentavos,
      createdAt: bookings.createdAt,
      customerName: users.name,
      customerPhone: users.phone,
      shopName: shops.name,
      shopSlug: shops.slug,
      serviceName: services.name,
      serviceDurationMin: services.durationMin,
      bookingType: services.bookingType,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(shops, eq(bookings.shopId, shops.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(whereClause)
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    total: totalResult?.count ?? 0,
    bookings: rows,
  };
}

/**
 * Fetches booking details, event lifecycle log, disputes, and audit history.
 */
export async function getAdminBookingById(bookingId: string) {
  const [booking] = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      status: bookings.status,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      address: bookings.address,
      notes: bookings.notes,
      totalCentavos: bookings.totalCentavos,
      quotedPriceCentavos: bookings.quotedPriceCentavos,
      expiresAt: bookings.expiresAt,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      customerId: users.id,
      customerName: users.name,
      customerPhone: users.phone,
      customerEmail: users.email,
      shopId: shops.id,
      shopName: shops.name,
      shopSlug: shops.slug,
      shopPhone: shops.phone,
      serviceId: services.id,
      serviceName: services.name,
      servicePriceCentavos: services.priceCentavos,
      serviceDurationMin: services.durationMin,
      bookingType: services.bookingType,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.customerId, users.id))
    .innerJoin(shops, eq(bookings.shopId, shops.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return null;

  const [events, disputes, chatMessages] = await Promise.all([
    db
      .select({
        id: bookingEvents.id,
        fromStatus: bookingEvents.fromStatus,
        toStatus: bookingEvents.toStatus,
        reason: bookingEvents.reason,
        createdAt: bookingEvents.createdAt,
        actorName: users.name,
      })
      .from(bookingEvents)
      .leftJoin(users, eq(bookingEvents.actorId, users.id))
      .where(eq(bookingEvents.bookingId, bookingId))
      .orderBy(asc(bookingEvents.createdAt)),
    db
      .select({
        id: reports.id,
        reason: reports.reason,
        status: reports.status,
        resolution: reports.resolution,
        createdAt: reports.createdAt,
        reporterName: users.name,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(eq(reports.bookingId, bookingId)),
    db
      .select({
        id: messages.id,
        body: messages.body,
        imagePath: messages.imagePath,
        createdAt: messages.createdAt,
        senderName: users.name,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.bookingId, bookingId))
      .orderBy(asc(messages.createdAt)),
  ]);

  return {
    ...booking,
    events,
    disputes,
    messages: chatMessages,
  };
}

/**
 * Lists disputes and reports on bookings and reviews.
 */
export async function getAdminDisputes(params: {
  status?: ReportStatus;
  targetType?: "booking" | "review";
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;

  const conditions = [];
  if (params.status) {
    conditions.push(eq(reports.status, params.status));
  }
  if (params.targetType === "booking") {
    conditions.push(sql`${reports.bookingId} is not null`);
  } else if (params.targetType === "review") {
    conditions.push(sql`${reports.reviewId} is not null`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(reports).where(whereClause);

  const rows = await db
    .select({
      id: reports.id,
      bookingId: reports.bookingId,
      reviewId: reports.reviewId,
      reason: reports.reason,
      status: reports.status,
      resolution: reports.resolution,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      reporterId: users.id,
      reporterName: users.name,
      reporterEmail: users.email,
      reporterPhone: users.phone,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(whereClause)
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with booking or review details
  const bookingIds = rows.map((r) => r.bookingId).filter(Boolean) as string[];
  const reviewIds = rows.map((r) => r.reviewId).filter(Boolean) as string[];

  const [bookingContexts, reviewContexts] = await Promise.all([
    bookingIds.length > 0
      ? db
          .select({
            id: bookings.id,
            refCode: bookings.refCode,
            status: bookings.status,
            shopName: shops.name,
            customerName: users.name,
          })
          .from(bookings)
          .innerJoin(shops, eq(bookings.shopId, shops.id))
          .innerJoin(users, eq(bookings.customerId, users.id))
          .where(inArray(bookings.id, bookingIds))
      : [],
    reviewIds.length > 0
      ? db
          .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            hidden: reviews.hidden,
            shopName: shops.name,
          })
          .from(reviews)
          .innerJoin(shops, eq(reviews.shopId, shops.id))
          .where(inArray(reviews.id, reviewIds))
      : [],
  ]);

  const bookingMap = new Map(bookingContexts.map((b) => [b.id, b]));
  const reviewMap = new Map(reviewContexts.map((r) => [r.id, r]));

  return {
    total: totalResult?.count ?? 0,
    disputes: rows.map((r) => ({
      ...r,
      booking: r.bookingId ? (bookingMap.get(r.bookingId) ?? null) : null,
      review: r.reviewId ? (reviewMap.get(r.reviewId) ?? null) : null,
    })),
  };
}

/**
 * Lists all announcements for management.
 */
export async function getAdminAnnouncements() {
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      message: announcements.message,
      kind: announcements.kind,
      targetAudience: announcements.targetAudience,
      actionUrl: announcements.actionUrl,
      actionLabel: announcements.actionLabel,
      isActive: announcements.isActive,
      startsAt: announcements.startsAt,
      endsAt: announcements.endsAt,
      createdAt: announcements.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.authorId, users.id))
    .orderBy(desc(announcements.createdAt));
}

/**
 * Returns active announcements visible to public users or shops.
 */
export async function getActiveAnnouncements(audience: AnnouncementAudience = "all") {
  const now = new Date();
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        or(eq(announcements.targetAudience, "all"), eq(announcements.targetAudience, audience)),
        or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
        or(isNull(announcements.endsAt), sql`${announcements.endsAt} >= ${now}`),
      ),
    )
    .orderBy(desc(announcements.createdAt));
}

/**
 * Lists fraud signals with filtering by severity, status, and targetType.
 */
export async function getAdminFraudSignals(params: {
  severity?: FraudSeverity;
  status?: FraudStatus;
  targetType?: FraudTargetType;
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;

  const conditions = [];
  if (params.severity) {
    conditions.push(eq(fraudSignals.severity, params.severity));
  }
  if (params.status) {
    conditions.push(eq(fraudSignals.status, params.status));
  }
  if (params.targetType) {
    conditions.push(eq(fraudSignals.targetType, params.targetType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(fraudSignals).where(whereClause);

  const rows = await db
    .select({
      id: fraudSignals.id,
      targetType: fraudSignals.targetType,
      targetId: fraudSignals.targetId,
      signalType: fraudSignals.signalType,
      severity: fraudSignals.severity,
      status: fraudSignals.status,
      score: fraudSignals.score,
      details: fraudSignals.details,
      resolvedAt: fraudSignals.resolvedAt,
      resolutionNotes: fraudSignals.resolutionNotes,
      createdAt: fraudSignals.createdAt,
      resolvedByName: users.name,
    })
    .from(fraudSignals)
    .leftJoin(users, eq(fraudSignals.resolvedById, users.id))
    .where(whereClause)
    .orderBy(desc(fraudSignals.score), desc(fraudSignals.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch names for targets
  const userTargets = rows.filter((r) => r.targetType === "user").map((r) => r.targetId);
  const shopTargets = rows.filter((r) => r.targetType === "shop").map((r) => r.targetId);

  const [targetUsers, targetShops] = await Promise.all([
    userTargets.length > 0
      ? db
          .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
          .from(users)
          .where(inArray(users.id, userTargets))
      : [],
    shopTargets.length > 0
      ? db
          .select({ id: shops.id, name: shops.name, slug: shops.slug, phone: shops.phone })
          .from(shops)
          .where(inArray(shops.id, shopTargets))
      : [],
  ]);

  const userMap = new Map(targetUsers.map((u) => [u.id, u]));
  const shopMap = new Map(targetShops.map((s) => [s.id, s]));

  return {
    total: totalResult?.count ?? 0,
    signals: rows.map((r) => ({
      ...r,
      targetUser: r.targetType === "user" ? (userMap.get(r.targetId) ?? null) : null,
      targetShop: r.targetType === "shop" ? (shopMap.get(r.targetId) ?? null) : null,
    })),
  };
}

/**
 * Lists audit log entries for SuperAdmin audit examination.
 */
export async function getAdminAuditLogs(params: {
  action?: string;
  targetType?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;

  const conditions = [];
  if (params.action?.trim()) {
    conditions.push(ilike(auditLog.action, `%${params.action.trim()}%`));
  }
  if (params.targetType?.trim()) {
    conditions.push(eq(auditLog.targetType, params.targetType.trim()));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(auditLog).where(whereClause);

  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      data: auditLog.data,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    total: totalResult?.count ?? 0,
    logs: rows,
  };
}
