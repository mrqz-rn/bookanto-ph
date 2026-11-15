"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  announcements,
  bookings,
  categories,
  fraudSignals,
  reports,
  reviews,
  shopCategories,
  shops,
  users,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";

import { scanForFraudSignals } from "./fraud-detector";
import {
  createBookingDisputeSchema,
  createCustomFraudSignalSchema,
  deleteAnnouncementSchema,
  deleteCategorySchema,
  logAdminBookingViewSchema,
  rejectShopSchema,
  resolveDisputeSchema,
  runFraudScanSchema,
  suspendShopSchema,
  suspendUserSchema,
  toggleAnnouncementActiveSchema,
  toggleCategoryActiveSchema,
  unsuspendShopSchema,
  unsuspendUserSchema,
  updateFraudSignalSchema,
  updateUserRoleSchema,
  upsertAnnouncementSchema,
  upsertCategorySchema,
  verifyShopSchema,
} from "./schema";

/**
 * Approves and verifies a shop, publishing it to the platform directory.
 */
export async function verifyShop(
  input: unknown,
): Promise<ActionResult<{ success: true; shopId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId } = parseInput(verifyShopSchema, input);

    assertCan(user, "admin:shop.verify");

    const [shop] = await db
      .select({ id: shops.id, slug: shops.slug, status: shops.status })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop) throw new AppError("NOT_FOUND", "Shop not found.");

    await db
      .update(shops)
      .set({
        status: "active",
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId));

    await writeAudit({
      actorId: user.id,
      action: "shop.verified",
      targetType: "shop",
      targetId: shopId,
      data: { previousStatus: shop.status, newStatus: "active" },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/admin/shops");
    revalidatePath(`/admin/shops/${shopId}`);

    return { success: true, shopId };
  });
}

/**
 * Rejects a pending shop verification request, reverting it to draft.
 */
export async function rejectShop(
  input: unknown,
): Promise<ActionResult<{ success: true; shopId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, reason } = parseInput(rejectShopSchema, input);

    assertCan(user, "admin:shop.verify");

    const [shop] = await db
      .select({ id: shops.id, status: shops.status })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop) throw new AppError("NOT_FOUND", "Shop not found.");

    await db
      .update(shops)
      .set({
        status: "draft",
        verifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId));

    await writeAudit({
      actorId: user.id,
      action: "shop.rejected",
      targetType: "shop",
      targetId: shopId,
      data: { reason, previousStatus: shop.status },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/admin/shops");
    revalidatePath(`/admin/shops/${shopId}`);

    return { success: true, shopId };
  });
}

/**
 * Suspends an offending or policy-violating shop.
 */
export async function suspendShop(
  input: unknown,
): Promise<ActionResult<{ success: true; shopId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, reason } = parseInput(suspendShopSchema, input);

    assertCan(user, "admin:shop.suspend");

    const [shop] = await db
      .select({ id: shops.id, status: shops.status })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop) throw new AppError("NOT_FOUND", "Shop not found.");

    await db
      .update(shops)
      .set({
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId));

    await writeAudit({
      actorId: user.id,
      action: "shop.suspended",
      targetType: "shop",
      targetId: shopId,
      data: { reason, previousStatus: shop.status },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/admin/shops");
    revalidatePath(`/admin/shops/${shopId}`);

    return { success: true, shopId };
  });
}

/**
 * Unsuspends a previously suspended shop, restoring active status.
 */
export async function unsuspendShop(
  input: unknown,
): Promise<ActionResult<{ success: true; shopId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId } = parseInput(unsuspendShopSchema, input);

    assertCan(user, "admin:shop.suspend");

    const [shop] = await db
      .select({ id: shops.id, status: shops.status })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop) throw new AppError("NOT_FOUND", "Shop not found.");

    await db
      .update(shops)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId));

    await writeAudit({
      actorId: user.id,
      action: "shop.unsuspended",
      targetType: "shop",
      targetId: shopId,
      data: { previousStatus: shop.status },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/admin/shops");
    revalidatePath(`/admin/shops/${shopId}`);

    return { success: true, shopId };
  });
}

/**
 * Creates or updates a service category.
 */
export async function upsertCategory(
  input: unknown,
): Promise<ActionResult<{ success: true; categoryId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(upsertCategorySchema, input);

    assertCan(user, "admin:category.manage");

    let categoryId: string;

    if (data.id) {
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, data.id))
        .limit(1);

      if (!existing) throw new AppError("NOT_FOUND", "Category not found.");

      await db
        .update(categories)
        .set({
          slug: data.slug,
          name: data.name,
          icon: data.icon,
          defaultBookingType: data.defaultBookingType,
          sortOrder: data.sortOrder,
          active: data.active,
          parentId: data.parentId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, data.id));

      categoryId = data.id;

      await writeAudit({
        actorId: user.id,
        action: "category.updated",
        targetType: "category",
        targetId: categoryId,
        data: { name: data.name, slug: data.slug, active: data.active },
      });
    } else {
      const [created] = await db
        .insert(categories)
        .values({
          slug: data.slug,
          name: data.name,
          icon: data.icon,
          defaultBookingType: data.defaultBookingType,
          sortOrder: data.sortOrder,
          active: data.active,
          parentId: data.parentId ?? null,
        })
        .returning({ id: categories.id });

      categoryId = created!.id;

      await writeAudit({
        actorId: user.id,
        action: "category.created",
        targetType: "category",
        targetId: categoryId,
        data: { name: data.name, slug: data.slug },
      });
    }

    revalidateTag(CACHE_TAGS.categories);
    revalidatePath("/admin/categories");

    return { success: true, categoryId };
  });
}

/**
 * Toggles a category's active state.
 */
export async function toggleCategoryActive(
  input: unknown,
): Promise<ActionResult<{ success: true; active: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { id, active } = parseInput(toggleCategoryActiveSchema, input);

    assertCan(user, "admin:category.manage");

    await db.update(categories).set({ active, updatedAt: new Date() }).where(eq(categories.id, id));

    await writeAudit({
      actorId: user.id,
      action: "category.toggled",
      targetType: "category",
      targetId: id,
      data: { active },
    });

    revalidateTag(CACHE_TAGS.categories);
    revalidatePath("/admin/categories");

    return { success: true, active };
  });
}

/**
 * Deletes a category if not in use by shops.
 */
export async function deleteCategory(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { id } = parseInput(deleteCategorySchema, input);

    assertCan(user, "admin:category.manage");

    const [inUse] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shopCategories)
      .where(eq(shopCategories.categoryId, id));

    if (inUse && inUse.count > 0) {
      throw new AppError(
        "CONFLICT",
        `Category is used by ${inUse.count} shop(s). Deactivate it instead of deleting.`,
      );
    }

    await db.delete(categories).where(eq(categories.id, id));

    await writeAudit({
      actorId: user.id,
      action: "category.deleted",
      targetType: "category",
      targetId: id,
    });

    revalidateTag(CACHE_TAGS.categories);
    revalidatePath("/admin/categories");

    return { success: true };
  });
}

/**
 * Suspends a user account.
 */
export async function suspendUser(
  input: unknown,
): Promise<ActionResult<{ success: true; userId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { userId, reason } = parseInput(suspendUserSchema, input);

    assertCan(user, "admin:user.suspend");

    if (userId === user.id) {
      throw new AppError("FORBIDDEN", "Cannot suspend your own account.");
    }

    const [target] = await db
      .select({ id: users.id, platformRole: users.platformRole })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) throw new AppError("NOT_FOUND", "User not found.");

    if (target.platformRole === "super_admin") {
      throw new AppError("FORBIDDEN", "Cannot suspend a Super Admin.");
    }

    await db
      .update(users)
      .set({
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await writeAudit({
      actorId: user.id,
      action: "user.suspended",
      targetType: "user",
      targetId: userId,
      data: { reason },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return { success: true, userId };
  });
}

/**
 * Unsuspends a previously suspended user account.
 */
export async function unsuspendUser(
  input: unknown,
): Promise<ActionResult<{ success: true; userId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { userId } = parseInput(unsuspendUserSchema, input);

    assertCan(user, "admin:user.suspend");

    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new AppError("NOT_FOUND", "User not found.");

    await db
      .update(users)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await writeAudit({
      actorId: user.id,
      action: "user.unsuspended",
      targetType: "user",
      targetId: userId,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return { success: true, userId };
  });
}

/**
 * Updates a user's platform role (Super Admin only).
 */
export async function updateUserRole(
  input: unknown,
): Promise<ActionResult<{ success: true; userId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { userId, role } = parseInput(updateUserRoleSchema, input);

    assertCan(user, "admin:admin.manage");

    if (userId === user.id && role !== "super_admin") {
      throw new AppError("FORBIDDEN", "Cannot demote your own Super Admin role.");
    }

    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new AppError("NOT_FOUND", "User not found.");

    await db
      .update(users)
      .set({
        platformRole: role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await writeAudit({
      actorId: user.id,
      action: "user.role_changed",
      targetType: "user",
      targetId: userId,
      data: { oldRole: target.platformRole, newRole: role },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return { success: true, userId };
  });
}

/**
 * Resolves or dismisses a dispute / report. Optionally hides the reported review.
 */
export async function resolveDispute(
  input: unknown,
): Promise<ActionResult<{ success: true; reportId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(resolveDisputeSchema, input);

    assertCan(user, "admin:report.resolve");

    const [report] = await db
      .select({
        id: reports.id,
        reviewId: reports.reviewId,
        bookingId: reports.bookingId,
        status: reports.status,
      })
      .from(reports)
      .where(eq(reports.id, data.reportId))
      .limit(1);

    if (!report) throw new AppError("NOT_FOUND", "Report not found.");

    await db.transaction(async (tx) => {
      await tx
        .update(reports)
        .set({
          status: data.status,
          resolution: data.resolution.trim(),
          updatedAt: new Date(),
        })
        .where(eq(reports.id, data.reportId));

      if (data.hideAssociatedReview && report.reviewId) {
        await tx
          .update(reviews)
          .set({ hidden: true, updatedAt: new Date() })
          .where(eq(reviews.id, report.reviewId));

        const [rev] = await tx
          .select({ shopId: reviews.shopId })
          .from(reviews)
          .where(eq(reviews.id, report.reviewId));

        if (rev) {
          const [stats] = await tx
            .select({
              avg: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float`,
              count: sql<number>`count(*)::int`,
            })
            .from(reviews)
            .where(and(eq(reviews.shopId, rev.shopId), eq(reviews.hidden, false)));

          await tx
            .update(shops)
            .set({
              ratingAvg: stats?.avg ?? 0,
              ratingCount: stats?.count ?? 0,
              updatedAt: new Date(),
            })
            .where(eq(shops.id, rev.shopId));
        }
      }
    });

    await writeAudit({
      actorId: user.id,
      action: "report.resolved",
      targetType: "report",
      targetId: data.reportId,
      data: {
        status: data.status,
        resolution: data.resolution,
        hideAssociatedReview: data.hideAssociatedReview ?? false,
      },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/admin/disputes");

    return { success: true, reportId: data.reportId };
  });
}

/**
 * Creates a booking dispute reported by a customer or shop member.
 */
export async function createBookingDispute(
  input: unknown,
): Promise<ActionResult<{ success: true; reportId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createBookingDisputeSchema, input);

    const [booking] = await db
      .select({ id: bookings.id, customerId: bookings.customerId, shopId: bookings.shopId })
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");

    const [created] = await db
      .insert(reports)
      .values({
        bookingId: data.bookingId,
        reporterId: user.id,
        reason: data.reason.trim(),
        status: "open",
      })
      .returning({ id: reports.id });

    await writeAudit({
      actorId: user.id,
      action: "booking.disputed",
      targetType: "report",
      targetId: created!.id,
      data: { bookingId: data.bookingId },
    });

    revalidatePath("/admin/disputes");

    return { success: true, reportId: created!.id };
  });
}

/**
 * Creates or updates an announcement banner.
 */
export async function upsertAnnouncement(
  input: unknown,
): Promise<ActionResult<{ success: true; announcementId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(upsertAnnouncementSchema, input);

    assertCan(user, "admin:announcement.manage");

    let announcementId: string;

    const startsAt = data.startsAt ? new Date(data.startsAt) : null;
    const endsAt = data.endsAt ? new Date(data.endsAt) : null;

    if (data.id) {
      const [existing] = await db
        .select({ id: announcements.id })
        .from(announcements)
        .where(eq(announcements.id, data.id))
        .limit(1);

      if (!existing) throw new AppError("NOT_FOUND", "Announcement not found.");

      await db
        .update(announcements)
        .set({
          title: data.title,
          message: data.message,
          kind: data.kind,
          targetAudience: data.targetAudience,
          actionUrl: data.actionUrl ?? null,
          actionLabel: data.actionLabel ?? null,
          isActive: data.isActive,
          startsAt,
          endsAt,
          updatedAt: new Date(),
        })
        .where(eq(announcements.id, data.id));

      announcementId = data.id;

      await writeAudit({
        actorId: user.id,
        action: "announcement.updated",
        targetType: "announcement",
        targetId: announcementId,
        data: { title: data.title, kind: data.kind, targetAudience: data.targetAudience },
      });
    } else {
      const [created] = await db
        .insert(announcements)
        .values({
          title: data.title,
          message: data.message,
          kind: data.kind,
          targetAudience: data.targetAudience,
          actionUrl: data.actionUrl ?? null,
          actionLabel: data.actionLabel ?? null,
          isActive: data.isActive,
          startsAt,
          endsAt,
          authorId: user.id,
        })
        .returning({ id: announcements.id });

      announcementId = created!.id;

      await writeAudit({
        actorId: user.id,
        action: "announcement.created",
        targetType: "announcement",
        targetId: announcementId,
        data: { title: data.title, kind: data.kind },
      });
    }

    revalidateTag(CACHE_TAGS.announcements);
    revalidatePath("/admin/announcements");

    return { success: true, announcementId };
  });
}

/**
 * Toggles an announcement's active status.
 */
export async function toggleAnnouncementActive(
  input: unknown,
): Promise<ActionResult<{ success: true; isActive: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { id, isActive } = parseInput(toggleAnnouncementActiveSchema, input);

    assertCan(user, "admin:announcement.manage");

    await db
      .update(announcements)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(announcements.id, id));

    await writeAudit({
      actorId: user.id,
      action: "announcement.toggled",
      targetType: "announcement",
      targetId: id,
      data: { isActive },
    });

    revalidateTag(CACHE_TAGS.announcements);
    revalidatePath("/admin/announcements");

    return { success: true, isActive };
  });
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncement(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { id } = parseInput(deleteAnnouncementSchema, input);

    assertCan(user, "admin:announcement.manage");

    await db.delete(announcements).where(eq(announcements.id, id));

    await writeAudit({
      actorId: user.id,
      action: "announcement.deleted",
      targetType: "announcement",
      targetId: id,
    });

    revalidateTag(CACHE_TAGS.announcements);
    revalidatePath("/admin/announcements");

    return { success: true };
  });
}

/**
 * Updates a fraud signal status (investigating, resolved, dismissed) with resolution notes.
 */
export async function updateFraudSignalStatus(
  input: unknown,
): Promise<ActionResult<{ success: true; signalId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateFraudSignalSchema, input);

    assertCan(user, "admin:fraud.manage");

    const [signal] = await db
      .select()
      .from(fraudSignals)
      .where(eq(fraudSignals.id, data.id))
      .limit(1);

    if (!signal) throw new AppError("NOT_FOUND", "Fraud signal not found.");

    const isDone = data.status === "resolved" || data.status === "dismissed";

    await db
      .update(fraudSignals)
      .set({
        status: data.status,
        resolutionNotes: data.resolutionNotes ?? null,
        resolvedById: isDone ? user.id : null,
        resolvedAt: isDone ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(fraudSignals.id, data.id));

    await writeAudit({
      actorId: user.id,
      action: "fraud_signal.updated",
      targetType: "fraud_signal",
      targetId: data.id,
      data: { status: data.status, resolutionNotes: data.resolutionNotes },
    });

    revalidatePath("/admin/fraud");

    return { success: true, signalId: data.id };
  });
}

/**
 * Allows administrators to file a custom fraud signal against a user, shop, or booking.
 */
export async function createCustomFraudSignal(
  input: unknown,
): Promise<ActionResult<{ success: true; signalId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createCustomFraudSignalSchema, input);

    assertCan(user, "admin:fraud.manage");

    const [created] = await db
      .insert(fraudSignals)
      .values({
        targetType: data.targetType,
        targetId: data.targetId,
        signalType: data.signalType,
        severity: data.severity,
        score: data.score,
        status: "active",
        details: { notes: data.notes, reportedByAdminId: user.id },
      })
      .returning({ id: fraudSignals.id });

    await writeAudit({
      actorId: user.id,
      action: "fraud_signal.created",
      targetType: "fraud_signal",
      targetId: created!.id,
      data: { targetType: data.targetType, targetId: data.targetId, severity: data.severity },
    });

    revalidatePath("/admin/fraud");

    return { success: true, signalId: created!.id };
  });
}

/**
 * Triggers an on-demand fraud signal scan across platform activity.
 */
export async function triggerFraudScan(
  input: unknown,
): Promise<ActionResult<{ scanned: number; newSignals: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    parseInput(runFraudScanSchema, input);

    assertCan(user, "admin:fraud.manage");

    const result = await scanForFraudSignals();

    await writeAudit({
      actorId: user.id,
      action: "fraud.scan_executed",
      targetType: "system",
      targetId: "fraud_detector",
      data: result,
    });

    revalidatePath("/admin/fraud");

    return { scanned: result.scanned, newSignals: result.newSignals };
  });
}

/**
 * Logs an admin's view of a booking into the immutable audit log.
 * As specified in development plan: "every admin view of a booking writes audit_log".
 */
export async function logAdminBookingView(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId } = parseInput(logAdminBookingViewSchema, input);

    if (user.platformRole !== "admin" && user.platformRole !== "super_admin") {
      throw new AppError("FORBIDDEN", "Only admins can log admin booking views.");
    }

    await writeAudit({
      actorId: user.id,
      action: "booking.viewed_by_admin",
      targetType: "booking",
      targetId: bookingId,
    });

    return { success: true };
  });
}
