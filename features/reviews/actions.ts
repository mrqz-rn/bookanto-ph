"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { bookings, media, reports, reviews, shops } from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";

import {
  addReviewPhotoSchema,
  createReviewSchema,
  hideReviewSchema,
  removeReviewPhotoSchema,
  replyToReviewSchema,
  reportReviewSchema,
  resolveReportSchema,
} from "./schema";

/**
 * Creates a rating and comment review for a completed booking, with optional photos.
 * Recomputes shops.ratingAvg and shops.ratingCount atomically.
 */
export async function createReview(
  input: unknown,
): Promise<ActionResult<{ reviewId: string; ratingAvg: number; ratingCount: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createReviewSchema, input);

    // 1. Fetch booking to verify existence, status and customer ownership
    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        shopId: bookings.shopId,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    // 2. Authorize via RBAC
    assertCan(user, "review:create", {
      customerId: booking.customerId,
      shopId: booking.shopId,
    });

    // 3. Plan rule: Only completed bookings can be reviewed
    if (booking.status !== "completed") {
      throw new AppError(
        "VALIDATION",
        "Only completed bookings can be reviewed. Please wait until your appointment is completed.",
      );
    }

    // 4. Plan rule: One review per booking
    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, data.bookingId))
      .limit(1);

    if (existingReview) {
      throw new AppError("CONFLICT", "You have already submitted a review for this booking.");
    }

    // 5. Transaction: Insert review, photos, and update shop rating aggregates
    const result = await db.transaction(async (tx) => {
      const [createdReview] = await tx
        .insert(reviews)
        .values({
          bookingId: data.bookingId,
          customerId: user.id,
          shopId: booking.shopId,
          rating: data.rating,
          comment: data.comment?.trim() ? data.comment.trim() : null,
          hidden: false,
        })
        .returning();

      if (!createdReview) {
        throw new AppError("INTERNAL", "Failed to save review.");
      }

      // Insert photos if any
      if (data.photoPaths && data.photoPaths.length > 0) {
        for (let i = 0; i < data.photoPaths.length; i++) {
          const photoPath = data.photoPaths[i];
          if (photoPath) {
            await tx.insert(media).values({
              ownerType: "review",
              ownerId: createdReview.id,
              path: photoPath,
              kind: "photo",
              sortOrder: i,
            });
          }
        }
      }

      // Recalculate average and count from all non-hidden reviews for this shop
      const [stats] = await tx
        .select({
          avg: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(and(eq(reviews.shopId, booking.shopId), eq(reviews.hidden, false)));

      const newAvg = stats?.avg ?? data.rating;
      const newCount = stats?.count ?? 1;

      await tx
        .update(shops)
        .set({
          ratingAvg: newAvg,
          ratingCount: newCount,
          updatedAt: new Date(),
        })
        .where(eq(shops.id, booking.shopId));

      return {
        reviewId: createdReview.id,
        ratingAvg: newAvg,
        ratingCount: newCount,
      };
    });

    // 6. Audit log
    await writeAudit({
      actorId: user.id,
      action: "review.created",
      targetType: "review",
      targetId: result.reviewId,
      data: {
        bookingId: data.bookingId,
        shopId: booking.shopId,
        rating: data.rating,
        photosCount: data.photoPaths?.length ?? 0,
      },
    });

    // 7. Cache invalidation
    revalidateTag(CACHE_TAGS.shops);
    revalidatePath(`/dashboard/reviews`);
    revalidatePath(`/account/bookings`);

    return result;
  });
}

/**
 * Submits or updates the shop's official response to a customer's review.
 * Authorized for shop owners and managers.
 */
export async function replyToReview(
  input: unknown,
): Promise<ActionResult<{ success: true; reviewId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(replyToReviewSchema, input);

    // 1. Fetch review to confirm shop ownership
    const [review] = await db
      .select({
        id: reviews.id,
        shopId: reviews.shopId,
        reply: reviews.reply,
        hidden: reviews.hidden,
      })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review) {
      throw new AppError("NOT_FOUND", "Review not found.");
    }

    if (review.shopId !== data.shopId) {
      throw new AppError("FORBIDDEN", "This review does not belong to the specified shop.");
    }

    // 2. Authorize
    assertCan(user, "review:reply", { shopId: data.shopId });

    // 3. Update review with official reply
    await db
      .update(reviews)
      .set({
        reply: data.reply.trim(),
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, data.reviewId));

    // 4. Audit
    await writeAudit({
      actorId: user.id,
      action: "review.replied",
      targetType: "review",
      targetId: data.reviewId,
      data: {
        shopId: data.shopId,
        isUpdate: !!review.reply,
      },
    });

    // 5. Invalidate
    revalidateTag(CACHE_TAGS.shops);
    revalidatePath(`/dashboard/reviews`);
    revalidatePath(`/account/bookings`);

    return { success: true, reviewId: data.reviewId };
  });
}

/**
 * Reports an inappropriate review for moderation.
 * Prevents spamming duplicate reports from the same user.
 */
export async function reportReview(
  input: unknown,
): Promise<ActionResult<{ success: true; reportId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(reportReviewSchema, input);

    assertCan(user, "review:report");

    // 1. Verify review exists and is active
    const [review] = await db
      .select({
        id: reviews.id,
        shopId: reviews.shopId,
        hidden: reviews.hidden,
      })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review || review.hidden) {
      throw new AppError("NOT_FOUND", "Review not found or already removed.");
    }

    // 2. Prevent duplicate reports from the same user
    const [existingReport] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.reviewId, data.reviewId), eq(reports.reporterId, user.id)))
      .limit(1);

    if (existingReport) {
      throw new AppError("CONFLICT", "You have already submitted a report for this review.");
    }

    // 3. Format reason
    const formattedReason = data.reasonType
      ? `[${data.reasonType.toUpperCase()}] ${data.reason.trim()}`
      : data.reason.trim();

    // 4. Insert report
    const [created] = await db
      .insert(reports)
      .values({
        reviewId: data.reviewId,
        reporterId: user.id,
        reason: formattedReason,
        status: "open",
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Could not submit report.");
    }

    // 5. Audit
    await writeAudit({
      actorId: user.id,
      action: "review.reported",
      targetType: "report",
      targetId: created.id,
      data: {
        reviewId: data.reviewId,
        reasonType: data.reasonType ?? null,
      },
    });

    return { success: true, reportId: created.id };
  });
}

/**
 * Moderates a review by setting hidden = true/false.
 * Only administrators can hide reviews. Atomically updates shop averages.
 */
export async function hideReview(
  input: unknown,
): Promise<ActionResult<{ success: true; hidden: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(hideReviewSchema, input);

    assertCan(user, "admin:review.hide");

    const [review] = await db
      .select({
        id: reviews.id,
        shopId: reviews.shopId,
        hidden: reviews.hidden,
      })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review) {
      throw new AppError("NOT_FOUND", "Review not found.");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(reviews)
        .set({
          hidden: data.hidden,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, data.reviewId));

      // Recalculate average and count without the hidden review
      const [stats] = await tx
        .select({
          avg: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(and(eq(reviews.shopId, review.shopId), eq(reviews.hidden, false)));

      await tx
        .update(shops)
        .set({
          ratingAvg: stats?.avg ?? 0,
          ratingCount: stats?.count ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(shops.id, review.shopId));
    });

    await writeAudit({
      actorId: user.id,
      action: data.hidden ? "review.hidden" : "review.restored",
      targetType: "review",
      targetId: data.reviewId,
      data: { shopId: review.shopId, hidden: data.hidden },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath(`/dashboard/reviews`);

    return { success: true, hidden: data.hidden };
  });
}

/**
 * Resolves or dismisses a report filed on a review or booking.
 * Administrator permission required.
 */
export async function resolveReport(
  input: unknown,
): Promise<ActionResult<{ success: true; status: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(resolveReportSchema, input);

    assertCan(user, "admin:report.resolve");

    const [report] = await db
      .select({
        id: reports.id,
        status: reports.status,
      })
      .from(reports)
      .where(eq(reports.id, data.reportId))
      .limit(1);

    if (!report) {
      throw new AppError("NOT_FOUND", "Report not found.");
    }

    await db
      .update(reports)
      .set({
        status: data.status,
        resolution: data.resolution.trim(),
        updatedAt: new Date(),
      })
      .where(eq(reports.id, data.reportId));

    await writeAudit({
      actorId: user.id,
      action: "report.resolved",
      targetType: "report",
      targetId: data.reportId,
      data: {
        status: data.status,
        resolution: data.resolution.trim(),
      },
    });

    return { success: true, status: data.status };
  });
}

/**
 * Attaches an uploaded photo to an existing review.
 */
export async function addReviewPhoto(input: unknown): Promise<ActionResult<{ mediaId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(addReviewPhotoSchema, input);

    const [review] = await db
      .select({
        id: reviews.id,
        customerId: reviews.customerId,
      })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review) {
      throw new AppError("NOT_FOUND", "Review not found.");
    }

    if (review.customerId !== user.id) {
      throw new AppError("FORBIDDEN", "You can only add photos to your own review.");
    }

    // Limit check
    const existingPhotos = await db
      .select({ id: media.id })
      .from(media)
      .where(
        and(
          eq(media.ownerType, "review"),
          eq(media.ownerId, data.reviewId),
          eq(media.kind, "photo"),
        ),
      );

    if (existingPhotos.length >= 5) {
      throw new AppError("VALIDATION", "A maximum of 5 photos is allowed per review.");
    }

    const [created] = await db
      .insert(media)
      .values({
        ownerType: "review",
        ownerId: data.reviewId,
        path: data.path,
        kind: "photo",
        sortOrder: data.sortOrder,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Could not save photo.");
    }

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath(`/dashboard/reviews`);
    revalidatePath(`/account/bookings`);

    return { mediaId: created.id };
  });
}

/**
 * Removes a photo from an existing review.
 */
export async function removeReviewPhoto(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(removeReviewPhotoSchema, input);

    const [review] = await db
      .select({
        id: reviews.id,
        customerId: reviews.customerId,
      })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review) {
      throw new AppError("NOT_FOUND", "Review not found.");
    }

    if (review.customerId !== user.id) {
      throw new AppError("FORBIDDEN", "You can only remove photos from your own review.");
    }

    await db
      .delete(media)
      .where(
        and(
          eq(media.id, data.mediaId),
          eq(media.ownerType, "review"),
          eq(media.ownerId, data.reviewId),
        ),
      );

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath(`/dashboard/reviews`);
    revalidatePath(`/account/bookings`);

    return { success: true };
  });
}
