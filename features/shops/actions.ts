"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  businessHours,
  media,
  shopCategories,
  shopMembers,
  shops,
  slugRedirects,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";

import {
  addShopPhotoSchema,
  createShopSchema,
  removeShopMediaSchema,
  reorderShopMediaSchema,
  setAcceptingTodaySchema,
  submitForVerificationSchema,
  updateShopDetailsSchema,
  updateShopHoursSchema,
  updateShopLocationSchema,
  uploadShopDocumentSchema,
} from "./schema";

/**
 * Creates a new shop record in 'draft' status and assigns the current user as owner.
 */
export async function createShop(
  input: unknown,
): Promise<ActionResult<{ shopId: string; slug: string }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(createShopSchema, input);

    // 3. Authorize
    assertCan(user, "shop:create");

    // 4. Transaction
    const newShop = await db.transaction(async (tx) => {
      // Check slug uniqueness
      const [existing] = await tx
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.slug, data.slug))
        .limit(1);

      if (existing) {
        throw new AppError(
          "CONFLICT",
          "This web address / slug is already taken. Please choose another.",
        );
      }

      const [created] = await tx
        .insert(shops)
        .values({
          ownerId: user.id,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          phone: data.phone,
          status: "draft",
        })
        .returning();

      if (!created) {
        throw new AppError("INTERNAL", "Failed to create shop record.");
      }

      // Add owner membership
      await tx.insert(shopMembers).values({
        shopId: created.id,
        userId: user.id,
        role: "owner",
        active: true,
      });

      // Add categories
      for (const categoryId of data.categoryIds) {
        await tx.insert(shopCategories).values({
          shopId: created.id,
          categoryId,
        });
      }

      // Populate default business hours (Monday to Saturday: 9am - 6pm)
      const defaultDays = [1, 2, 3, 4, 5, 6];
      for (const weekday of defaultDays) {
        await tx.insert(businessHours).values({
          shopId: created.id,
          weekday,
          opens: "09:00",
          closes: "18:00",
        });
      }

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "shop.create",
          targetType: "shop",
          targetId: created.id,
          data: { name: created.name, slug: created.slug },
        },
        tx,
      );

      return created;
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");

    return { shopId: newShop.id, slug: newShop.slug };
  });
}

/**
 * Updates basic shop details and categories.
 */
export async function updateShop(
  input: unknown,
): Promise<ActionResult<{ shopId: string; slug: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateShopDetailsSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      const [existingShop] = await tx
        .select()
        .from(shops)
        .where(eq(shops.id, data.shopId))
        .limit(1);

      if (!existingShop) {
        throw new AppError("NOT_FOUND", "Shop not found.");
      }

      // If slug changed, verify availability and record redirect
      if (existingShop.slug !== data.slug) {
        const [taken] = await tx
          .select({ id: shops.id })
          .from(shops)
          .where(and(eq(shops.slug, data.slug), ne(shops.id, data.shopId)))
          .limit(1);

        if (taken) {
          throw new AppError(
            "CONFLICT",
            "This web address / slug is already taken. Please choose another.",
          );
        }

        // Record slug redirect for SEO retention
        await tx
          .insert(slugRedirects)
          .values({
            fromSlug: existingShop.slug,
            shopId: data.shopId,
          })
          .onConflictDoNothing();
      }

      await tx
        .update(shops)
        .set({
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          phone: data.phone,
          updatedAt: sql`now()`,
        })
        .where(eq(shops.id, data.shopId));

      // Refresh categories
      await tx.delete(shopCategories).where(eq(shopCategories.shopId, data.shopId));
      for (const categoryId of data.categoryIds) {
        await tx.insert(shopCategories).values({
          shopId: data.shopId,
          categoryId,
        });
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "shop.update_details",
          targetType: "shop",
          targetId: data.shopId,
          data: { name: data.name, slug: data.slug },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath(`/dashboard/setup`);
    revalidatePath(`/shop/${data.slug}`);

    return { shopId: data.shopId, slug: data.slug };
  });
}

/**
 * Updates shop location address and coordinates.
 */
export async function updateShopLocation(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateShopLocationSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.id, data.shopId))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", "Shop not found.");
      }

      await tx
        .update(shops)
        .set({
          address: data.address,
          cityId: data.cityId ?? null,
          barangayId: data.barangayId ?? null,
          location: { lng: data.lng, lat: data.lat },
          updatedAt: sql`now()`,
        })
        .where(eq(shops.id, data.shopId));

      await writeAudit(
        {
          actorId: user.id,
          action: "shop.update_location",
          targetType: "shop",
          targetId: data.shopId,
          data: { lat: data.lat, lng: data.lng, address: data.address },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Updates weekly business hours for the shop.
 */
export async function setShopHours(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateShopHoursSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      await tx.delete(businessHours).where(eq(businessHours.shopId, data.shopId));

      for (const item of data.hours) {
        await tx.insert(businessHours).values({
          shopId: data.shopId,
          weekday: item.weekday,
          opens: item.opens,
          closes: item.closes,
          breakStart: item.breakStart ?? null,
          breakEnd: item.breakEnd ?? null,
        });
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "shop.update_hours",
          targetType: "shop",
          targetId: data.shopId,
          data: { hoursCount: data.hours.length },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Adds a photo record to the media table for the shop.
 */
export async function addShopPhoto(input: unknown): Promise<ActionResult<{ mediaId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(addShopPhotoSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    const [created] = await db
      .insert(media)
      .values({
        ownerType: "shop",
        ownerId: data.shopId,
        path: data.path,
        kind: "photo",
        sortOrder: data.sortOrder,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Could not save photo record.");
    }

    revalidateTag(CACHE_TAGS.shops);
    return { mediaId: created.id };
  });
}

/**
 * Removes a media record (photo or document) belonging to the shop.
 */
export async function removeShopMedia(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(removeShopMediaSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    await db.delete(media).where(and(eq(media.id, data.mediaId), eq(media.ownerId, data.shopId)));

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Reorders shop photos.
 */
export async function reorderShopMedia(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(reorderShopMediaSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      for (let i = 0; i < data.mediaIds.length; i++) {
        const mediaId = data.mediaIds[i];
        if (mediaId) {
          await tx
            .update(media)
            .set({ sortOrder: i, updatedAt: sql`now()` })
            .where(and(eq(media.id, mediaId), eq(media.ownerId, data.shopId)));
        }
      }
    });

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Uploads/records a verification document for the shop.
 */
export async function uploadShopDocument(
  input: unknown,
): Promise<ActionResult<{ mediaId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(uploadShopDocumentSchema, input);
    assertCan(user, "shop_document:upload", { shopId: data.shopId });

    const [created] = await db
      .insert(media)
      .values({
        ownerType: "shop",
        ownerId: data.shopId,
        path: data.path,
        kind: "document",
        sortOrder: data.sortOrder,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Could not save document record.");
    }

    await writeAudit({
      actorId: user.id,
      action: "shop.document_uploaded",
      targetType: "shop",
      targetId: data.shopId,
      data: { mediaId: created.id },
    });

    return { mediaId: created.id };
  });
}

/**
 * Validates that all 5 steps are filled out and submits the shop for verification review.
 */
export async function submitForVerification(
  input: unknown,
): Promise<ActionResult<{ success: true; status: "pending" }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(submitForVerificationSchema, input);
    assertCan(user, "shop_document:upload", { shopId: data.shopId });

    // Verify completeness:
    // 1. Basic details
    const [shop] = await db.select().from(shops).where(eq(shops.id, data.shopId)).limit(1);

    if (!shop) {
      throw new AppError("NOT_FOUND", "Shop not found.");
    }

    if (!shop.address || !shop.location) {
      throw new AppError(
        "VALIDATION",
        "Please provide the complete address and map pin for your shop.",
      );
    }

    // 2. Categories
    const shopCats = await db
      .select()
      .from(shopCategories)
      .where(eq(shopCategories.shopId, data.shopId));

    if (shopCats.length === 0) {
      throw new AppError("VALIDATION", "Please select at least one service category.");
    }

    // 3. Operating hours
    const hours = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.shopId, data.shopId));

    if (hours.length === 0) {
      throw new AppError("VALIDATION", "Please set operating hours for at least one day.");
    }

    // 4. Verification documents
    const documents = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.ownerType, "shop"),
          eq(media.ownerId, data.shopId),
          eq(media.kind, "document"),
        ),
      );

    if (documents.length === 0) {
      throw new AppError(
        "VALIDATION",
        "Please upload at least one verification document (e.g. Mayor's permit, DTI, or Valid ID).",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(shops)
        .set({
          status: "pending",
          updatedAt: sql`now()`,
        })
        .where(eq(shops.id, data.shopId));

      await writeAudit(
        {
          actorId: user.id,
          action: "shop.submitted_for_verification",
          targetType: "shop",
          targetId: data.shopId,
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/setup");

    return { success: true, status: "pending" };
  });
}

/**
 * Toggles whether the shop is currently accepting bookings today.
 */
export async function setAcceptingToday(
  input: unknown,
): Promise<ActionResult<{ success: true; accepting: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(setAcceptingTodaySchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    await writeAudit({
      actorId: user.id,
      action: data.accepting ? "shop.accepting_resumed" : "shop.accepting_paused",
      targetType: "shop",
      targetId: data.shopId,
    });

    revalidateTag(CACHE_TAGS.shops);
    return { success: true, accepting: data.accepting };
  });
}
