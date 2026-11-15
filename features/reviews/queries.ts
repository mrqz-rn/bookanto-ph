import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { bookings, media, reports, reviews, services, users } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/media";

import { REVIEW_HIGHLIGHTS, type ReviewSortOption } from "./constants";

export type ReviewPhoto = {
  id: string;
  path: string;
  url: string;
  sortOrder: number;
};

export type PublicReviewItem = {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  serviceName: string | null;
  photos: ReviewPhoto[];
  createdAt: string;
  updatedAt: string;
  matchedHighlights: string[];
};

export type ReviewDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type HighlightCount = {
  id: string;
  label: string;
  count: number;
};

export type ShopReviewStats = {
  ratingAvg: number;
  ratingCount: number;
  recommendPercentage: number;
  distribution: ReviewDistribution;
  highlights: HighlightCount[];
  photosCount: number;
  showcasePhotos: ReviewPhoto[];
};

/**
 * Computes aggregate review stats, distribution, highlights, and photo showcase for a shop.
 */
export async function getShopReviewStats(shopId: string): Promise<ShopReviewStats> {
  // Fetch all non-hidden reviews for this shop to compute accurate distribution and highlights
  const shopReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
    })
    .from(reviews)
    .where(and(eq(reviews.shopId, shopId), eq(reviews.hidden, false)));

  const total = shopReviews.length;
  const distribution: ReviewDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  let recommendCount = 0;

  // Highlight matches map
  const highlightCounts = new Map<string, number>();
  for (const h of REVIEW_HIGHLIGHTS) {
    highlightCounts.set(h.id, 0);
  }

  for (const r of shopReviews) {
    const star = r.rating as 1 | 2 | 3 | 4 | 5;
    if (distribution[star] !== undefined) {
      distribution[star]++;
    }
    ratingSum += r.rating;
    if (r.rating >= 4) {
      recommendCount++;
    }

    if (r.comment) {
      const lowerComment = r.comment.toLowerCase();
      for (const h of REVIEW_HIGHLIGHTS) {
        const matches = h.keywords.some((kw) => lowerComment.includes(kw.toLowerCase()));
        if (matches) {
          highlightCounts.set(h.id, (highlightCounts.get(h.id) ?? 0) + 1);
        }
      }
    }
  }

  const ratingAvg = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0;
  const recommendPercentage = total > 0 ? Math.round((recommendCount / total) * 100) : 0;

  // Highlights with at least 1 review mention
  const highlights: HighlightCount[] = REVIEW_HIGHLIGHTS.map((h) => ({
    id: h.id,
    label: h.label,
    count: highlightCounts.get(h.id) ?? 0,
  }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);

  // Fetch photos for showcase
  const reviewIds = shopReviews.map((r) => r.id);
  let showcasePhotos: ReviewPhoto[] = [];
  let photosCount = 0;

  if (reviewIds.length > 0) {
    const allPhotos = await db
      .select({
        id: media.id,
        path: media.path,
        sortOrder: media.sortOrder,
      })
      .from(media)
      .where(
        and(
          eq(media.ownerType, "review"),
          inArray(media.ownerId, reviewIds),
          eq(media.kind, "photo"),
        ),
      )
      .orderBy(asc(media.sortOrder), desc(media.createdAt));

    photosCount = allPhotos.length;
    showcasePhotos = allPhotos.slice(0, 12).map((p) => ({
      ...p,
      url: mediaUrl(p.path),
    }));
  }

  return {
    ratingAvg,
    ratingCount: total,
    recommendPercentage,
    distribution,
    highlights,
    photosCount,
    showcasePhotos,
  };
}

export type GetShopReviewsOptions = {
  rating?: number;
  hasPhotos?: boolean;
  highlight?: string;
  sort?: ReviewSortOption;
  limit?: number;
  offset?: number;
};

/**
 * Loads paginated public reviews for a shop with customer info, service details, and photos.
 */
export async function getShopReviews(
  shopId: string,
  options: GetShopReviewsOptions = {},
): Promise<{ items: PublicReviewItem[]; total: number }> {
  const { rating, hasPhotos, highlight, sort = "recent", limit = 10, offset = 0 } = options;

  // Base query conditions
  const conditions = [eq(reviews.shopId, shopId), eq(reviews.hidden, false)];
  if (rating !== undefined && rating >= 1 && rating <= 5) {
    conditions.push(eq(reviews.rating, rating));
  }

  // Load all matching candidates to filter by photo/highlight in memory if needed
  const rawReviews = await db
    .select({
      id: reviews.id,
      bookingId: reviews.bookingId,
      customerId: reviews.customerId,
      customerName: users.name,
      rating: reviews.rating,
      comment: reviews.comment,
      reply: reviews.reply,
      serviceName: services.name,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.customerId))
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(and(...conditions))
    .orderBy(
      sort === "highest"
        ? desc(reviews.rating)
        : sort === "lowest"
          ? asc(reviews.rating)
          : desc(reviews.createdAt),
      desc(reviews.createdAt),
    );

  if (rawReviews.length === 0) {
    return { items: [], total: 0 };
  }

  const reviewIds = rawReviews.map((r) => r.id);

  // Load photos for all these reviews
  const photos = await db
    .select({
      id: media.id,
      ownerId: media.ownerId,
      path: media.path,
      sortOrder: media.sortOrder,
    })
    .from(media)
    .where(
      and(
        eq(media.ownerType, "review"),
        inArray(media.ownerId, reviewIds),
        eq(media.kind, "photo"),
      ),
    )
    .orderBy(asc(media.sortOrder));

  const photosByReview = new Map<string, ReviewPhoto[]>();
  for (const p of photos) {
    const list = photosByReview.get(p.ownerId) ?? [];
    list.push({
      id: p.id,
      path: p.path,
      url: mediaUrl(p.path),
      sortOrder: p.sortOrder,
    });
    photosByReview.set(p.ownerId, list);
  }

  // Helper to extract matched highlights
  function extractHighlights(comment: string | null): string[] {
    if (!comment) return [];
    const lower = comment.toLowerCase();
    return REVIEW_HIGHLIGHTS.filter((h) =>
      h.keywords.some((kw) => lower.includes(kw.toLowerCase())),
    ).map((h) => h.id);
  }

  let mappedItems: PublicReviewItem[] = rawReviews.map((r) => {
    const itemPhotos = photosByReview.get(r.id) ?? [];
    const matchedHighlights = extractHighlights(r.comment);
    return {
      id: r.id,
      bookingId: r.bookingId,
      customerId: r.customerId,
      customerName: r.customerName || "Customer",
      rating: r.rating,
      comment: r.comment,
      reply: r.reply,
      serviceName: r.serviceName,
      photos: itemPhotos,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      matchedHighlights,
    };
  });

  // Apply filters
  if (hasPhotos) {
    mappedItems = mappedItems.filter((i) => i.photos.length > 0);
  }

  if (highlight) {
    mappedItems = mappedItems.filter((i) => i.matchedHighlights.includes(highlight));
  }

  if (sort === "with_photos") {
    mappedItems.sort((a, b) => {
      if (a.photos.length > 0 && b.photos.length === 0) return -1;
      if (b.photos.length > 0 && a.photos.length === 0) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const total = mappedItems.length;
  const paginated = mappedItems.slice(offset, offset + limit);

  return { items: paginated, total };
}

/**
 * Returns the review associated with a specific booking (if already reviewed).
 */
export async function getBookingReview(bookingId: string): Promise<PublicReviewItem | null> {
  const [row] = await db
    .select({
      id: reviews.id,
      bookingId: reviews.bookingId,
      customerId: reviews.customerId,
      customerName: users.name,
      rating: reviews.rating,
      comment: reviews.comment,
      reply: reviews.reply,
      serviceName: services.name,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.customerId))
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(eq(reviews.bookingId, bookingId))
    .limit(1);

  if (!row) return null;

  const photos = await db
    .select({
      id: media.id,
      path: media.path,
      sortOrder: media.sortOrder,
    })
    .from(media)
    .where(and(eq(media.ownerType, "review"), eq(media.ownerId, row.id), eq(media.kind, "photo")))
    .orderBy(asc(media.sortOrder));

  return {
    id: row.id,
    bookingId: row.bookingId,
    customerId: row.customerId,
    customerName: row.customerName || "Customer",
    rating: row.rating,
    comment: row.comment,
    reply: row.reply,
    serviceName: row.serviceName,
    photos: photos.map((p) => ({
      ...p,
      url: mediaUrl(p.path),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    matchedHighlights: [],
  };
}

export type DashboardReviewItem = PublicReviewItem & {
  hasReply: boolean;
  reportsCount: number;
};

/**
 * Returns reviews for the shop dashboard, including reply statuses and report counts.
 */
export async function getShopDashboardReviews(
  shopId: string,
  options: {
    filter?: "all" | "unreplied" | "replied";
    rating?: number;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: DashboardReviewItem[]; total: number; unrepliedCount: number }> {
  const { filter = "all", rating, limit = 20, offset = 0 } = options;

  const baseReviews = await db
    .select({
      id: reviews.id,
      bookingId: reviews.bookingId,
      customerId: reviews.customerId,
      customerName: users.name,
      rating: reviews.rating,
      comment: reviews.comment,
      reply: reviews.reply,
      serviceName: services.name,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.customerId))
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(and(eq(reviews.shopId, shopId), eq(reviews.hidden, false)))
    .orderBy(desc(reviews.createdAt));

  const unrepliedCount = baseReviews.filter((r) => !r.reply).length;

  if (baseReviews.length === 0) {
    return { items: [], total: 0, unrepliedCount: 0 };
  }

  const reviewIds = baseReviews.map((r) => r.id);

  // Photos
  const photos = await db
    .select({
      id: media.id,
      ownerId: media.ownerId,
      path: media.path,
      sortOrder: media.sortOrder,
    })
    .from(media)
    .where(
      and(
        eq(media.ownerType, "review"),
        inArray(media.ownerId, reviewIds),
        eq(media.kind, "photo"),
      ),
    )
    .orderBy(asc(media.sortOrder));

  const photosByReview = new Map<string, ReviewPhoto[]>();
  for (const p of photos) {
    const list = photosByReview.get(p.ownerId) ?? [];
    list.push({
      id: p.id,
      path: p.path,
      url: mediaUrl(p.path),
      sortOrder: p.sortOrder,
    });
    photosByReview.set(p.ownerId, list);
  }

  // Reports
  const reviewReports = await db
    .select({
      reviewId: reports.reviewId,
      count: sql<number>`count(*)::int`,
    })
    .from(reports)
    .where(and(inArray(reports.reviewId, reviewIds), eq(reports.status, "open")))
    .groupBy(reports.reviewId);

  const reportsByReview = new Map<string, number>();
  for (const rep of reviewReports) {
    if (rep.reviewId) {
      reportsByReview.set(rep.reviewId, rep.count);
    }
  }

  let mapped: DashboardReviewItem[] = baseReviews.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    customerId: r.customerId,
    customerName: r.customerName || "Customer",
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    serviceName: r.serviceName,
    photos: photosByReview.get(r.id) ?? [],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    matchedHighlights: [],
    hasReply: !!r.reply,
    reportsCount: reportsByReview.get(r.id) ?? 0,
  }));

  if (filter === "unreplied") {
    mapped = mapped.filter((r) => !r.hasReply);
  } else if (filter === "replied") {
    mapped = mapped.filter((r) => r.hasReply);
  }

  if (rating !== undefined) {
    mapped = mapped.filter((r) => r.rating === rating);
  }

  const total = mapped.length;
  const paginated = mapped.slice(offset, offset + limit);

  return { items: paginated, total, unrepliedCount };
}
