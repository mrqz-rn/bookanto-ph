"use server";

import { randomUUID } from "node:crypto";
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
  staffSchedules,
  users,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { DOCUMENT_FILE_TYPES } from "@/lib/file-types";
import { MAX_FILE_SIZE_BYTES, validateDocumentBytes, validateImageBytes } from "@/lib/media";
import { createDocumentUploadUrl, readDocument, removeDocuments, uploadPhoto } from "@/lib/storage";

import {
  addShopPhotoSchema,
  addStaffMemberSchema,
  confirmShopDocumentSchema,
  createShopSchema,
  isShopDocumentPath,
  removeShopMediaSchema,
  removeStaffMemberSchema,
  reorderShopMediaSchema,
  setAcceptingTodaySchema,
  startShopDocumentUploadSchema,
  submitForVerificationSchema,
  toggleStaffActiveSchema,
  updateShopDetailsSchema,
  updateShopHoursSchema,
  updateShopLocationSchema,
  updateStaffRoleSchema,
} from "./schema";
import { MAX_SHOP_DOCUMENTS } from "./constants";

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
export async function addShopPhoto(
  input: unknown,
): Promise<ActionResult<{ mediaId: string; path: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(addShopPhotoSchema, input);
    assertCan(user, "shop:update", { shopId: data.shopId });

    let finalPath = data.path;

    if (data.imageBase64) {
      const buffer = Buffer.from(data.imageBase64, "base64");
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        throw new AppError("VALIDATION", "Photo exceeds 8 MB size limit.");
      }

      const imgCheck = validateImageBytes(buffer);
      if (!imgCheck.valid || !imgCheck.format || !imgCheck.mimeType) {
        throw new AppError(
          "VALIDATION",
          "Invalid photo format. Only genuine JPEG, PNG, and WebP images are allowed.",
        );
      }

      const filename = `shops/${data.shopId}/${Date.now()}-${randomUUID()}.${imgCheck.format}`;
      const uploadRes = await uploadPhoto(filename, buffer, imgCheck.mimeType);
      finalPath = uploadRes.path;
    }

    if (!finalPath) {
      throw new AppError("VALIDATION", "Photo path or image data is required.");
    }

    const [created] = await db
      .insert(media)
      .values({
        ownerType: "shop",
        ownerId: data.shopId,
        path: finalPath,
        kind: "photo",
        sortOrder: data.sortOrder,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Could not save photo record.");
    }

    revalidateTag(CACHE_TAGS.shops);
    return { mediaId: created.id, path: created.path };
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

    const [item] = await db
      .select({ id: media.id, path: media.path, kind: media.kind })
      .from(media)
      .where(
        and(
          eq(media.id, data.mediaId),
          eq(media.ownerType, "shop"),
          eq(media.ownerId, data.shopId),
        ),
      )
      .limit(1);
    if (!item) throw new AppError("NOT_FOUND");

    // Verification documents are the owner's alone (RBAC: managers can't see them).
    if (item.kind === "document") {
      assertCan(user, "shop_document:upload", { shopId: data.shopId });
    }

    await db.delete(media).where(eq(media.id, item.id));

    if (item.kind === "document") {
      await removeDocuments([item.path]);
      await writeAudit({
        actorId: user.id,
        action: "shop.document_removed",
        targetType: "shop",
        targetId: data.shopId,
        data: { mediaId: item.id },
      });
    }

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

/** Counts the verification documents a shop has on file. */
async function countShopDocuments(shopId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(media)
    .where(and(eq(media.ownerType, "shop"), eq(media.ownerId, shopId), eq(media.kind, "document")));
  return row?.count ?? 0;
}

/**
 * Step 1 of uploading a verification document: returns a one-time URL the
 * browser uploads the file to, at a path the server picks inside the shop's
 * folder of the private documents bucket. Nothing is recorded until
 * confirmShopDocument checks the file.
 */
export async function startShopDocumentUpload(
  input: unknown,
): Promise<ActionResult<{ uploadUrl: string; path: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(startShopDocumentUploadSchema, input);
    assertCan(user, "shop_document:upload", { shopId: data.shopId });

    if ((await countShopDocuments(data.shopId)) >= MAX_SHOP_DOCUMENTS) {
      throw new AppError(
        "VALIDATION",
        `You can keep up to ${MAX_SHOP_DOCUMENTS} documents. Remove one to add another.`,
      );
    }

    const ext = DOCUMENT_FILE_TYPES[data.contentType];
    const path = `${data.shopId}/${data.documentType}-${randomUUID()}.${ext}`;
    const { uploadUrl } = await createDocumentUploadUrl(path);
    return { uploadUrl, path };
  });
}

/**
 * Step 2: checks the uploaded file by its signature and size (deleting it if
 * it fails) and records it as a verification document.
 */
export async function confirmShopDocument(
  input: unknown,
): Promise<ActionResult<{ mediaId: string; path: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(confirmShopDocumentSchema, input);
    assertCan(user, "shop_document:upload", { shopId: data.shopId });

    if (!isShopDocumentPath(data.path, data.shopId, data.documentType)) {
      throw new AppError(
        "VALIDATION",
        "That upload doesn't belong to this shop. Please try again.",
      );
    }

    const [existing] = await db
      .select({ id: media.id })
      .from(media)
      .where(
        and(eq(media.ownerType, "shop"), eq(media.ownerId, data.shopId), eq(media.path, data.path)),
      )
      .limit(1);
    if (existing) return { mediaId: existing.id, path: data.path };

    const bytes = await readDocument(data.path);
    if (!bytes) {
      throw new AppError("VALIDATION", "We didn't receive the file. Please upload it again.");
    }
    if (bytes.length > MAX_FILE_SIZE_BYTES || !validateDocumentBytes(bytes).valid) {
      await removeDocuments([data.path]);
      throw new AppError(
        "VALIDATION",
        "That file isn't a PDF, JPEG, PNG or WebP under 8 MB. Please upload a clear photo or scan.",
      );
    }

    const [created] = await db
      .insert(media)
      .values({
        ownerType: "shop",
        ownerId: data.shopId,
        path: data.path,
        kind: "document",
        sortOrder: await countShopDocuments(data.shopId),
      })
      .returning({ id: media.id });

    if (!created) {
      throw new AppError("INTERNAL", "Could not save document record.");
    }

    await writeAudit({
      actorId: user.id,
      action: "shop.document_uploaded",
      targetType: "shop",
      targetId: data.shopId,
      data: { mediaId: created.id, documentType: data.documentType },
    });

    return { mediaId: created.id, path: data.path };
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

/**
 * Invites or registers a team member (staff or manager) for the shop.
 */
export async function addStaffMember(
  input: unknown,
): Promise<ActionResult<{ success: true; memberId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(addStaffMemberSchema, input);

    assertCan(user, "shop_member:manage", { shopId: data.shopId, memberRole: data.role });

    const newMember = await db.transaction(async (tx) => {
      // Find or create user by phone
      let [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.phone, data.phone))
        .limit(1);

      if (!existingUser) {
        const [createdUser] = await tx
          .insert(users)
          .values({
            authId: `staff_${randomUUID()}`,
            phone: data.phone,
            name: data.name,
            email: data.email ?? null,
            platformRole: "customer",
            status: "active",
          })
          .returning();

        if (!createdUser) {
          throw new AppError("INTERNAL", "Failed to create user account for staff member.");
        }
        existingUser = createdUser;
      }

      // Check if already a member of this shop
      const [existingMembership] = await tx
        .select()
        .from(shopMembers)
        .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, existingUser.id)))
        .limit(1);

      if (existingMembership) {
        throw new AppError("CONFLICT", "This person is already a team member of this shop.");
      }

      // Add to shop members
      const [createdMember] = await tx
        .insert(shopMembers)
        .values({
          shopId: data.shopId,
          userId: existingUser.id,
          role: data.role,
          active: true,
        })
        .returning();

      if (!createdMember) {
        throw new AppError("INTERNAL", "Failed to create shop membership.");
      }

      // Add default schedule setting
      await tx
        .insert(staffSchedules)
        .values({
          shopId: data.shopId,
          userId: existingUser.id,
          usesShopHours: true,
        })
        .onConflictDoNothing();

      await writeAudit(
        {
          actorId: user.id,
          action: "shop_member.added",
          targetType: "shop_member",
          targetId: createdMember.id,
          data: { shopId: data.shopId, role: data.role, userId: existingUser.id },
        },
        tx,
      );

      return createdMember;
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/availability");

    return { success: true, memberId: newMember.id };
  });
}

/**
 * Updates a staff member's role (manager or staff).
 */
export async function updateStaffRole(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateStaffRoleSchema, input);

    const [existingMember] = await db
      .select()
      .from(shopMembers)
      .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, data.userId)))
      .limit(1);

    if (!existingMember) {
      throw new AppError("NOT_FOUND", "Team member not found.");
    }

    if (existingMember.role === "owner") {
      throw new AppError("FORBIDDEN", "Cannot alter the shop owner's role.");
    }

    assertCan(user, "shop_member:manage", { shopId: data.shopId, memberRole: data.role });

    await db.transaction(async (tx) => {
      await tx
        .update(shopMembers)
        .set({
          role: data.role,
          updatedAt: sql`now()`,
        })
        .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, data.userId)));

      await writeAudit(
        {
          actorId: user.id,
          action: "shop_member.role_updated",
          targetType: "shop_member",
          targetId: existingMember.id,
          data: { shopId: data.shopId, newRole: data.role },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/staff");

    return { success: true };
  });
}

/**
 * Removes a staff member or manager from the shop.
 */
export async function removeStaffMember(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(removeStaffMemberSchema, input);

    const [existingMember] = await db
      .select()
      .from(shopMembers)
      .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, data.userId)))
      .limit(1);

    if (!existingMember) {
      throw new AppError("NOT_FOUND", "Team member not found.");
    }

    if (existingMember.role === "owner") {
      throw new AppError("FORBIDDEN", "Cannot remove the shop owner.");
    }

    assertCan(user, "shop_member:manage", { shopId: data.shopId, memberRole: existingMember.role });

    await db.transaction(async (tx) => {
      await tx
        .delete(staffSchedules)
        .where(and(eq(staffSchedules.shopId, data.shopId), eq(staffSchedules.userId, data.userId)));

      await tx
        .delete(shopMembers)
        .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, data.userId)));

      await writeAudit(
        {
          actorId: user.id,
          action: "shop_member.removed",
          targetType: "shop_member",
          targetId: existingMember.id,
          data: { shopId: data.shopId, userId: data.userId },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/availability");

    return { success: true };
  });
}

/**
 * Toggles whether a team member is active.
 */
export async function toggleStaffActive(
  input: unknown,
): Promise<ActionResult<{ success: true; active: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(toggleStaffActiveSchema, input);

    const [existingMember] = await db
      .select()
      .from(shopMembers)
      .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, data.userId)))
      .limit(1);

    if (!existingMember) {
      throw new AppError("NOT_FOUND", "Team member not found.");
    }

    if (existingMember.role === "owner" && !data.active) {
      throw new AppError("FORBIDDEN", "Cannot deactivate the shop owner.");
    }

    assertCan(user, "shop_member:manage", { shopId: data.shopId, memberRole: existingMember.role });

    await db.transaction(async (tx) => {
      await tx
        .update(shopMembers)
        .set({
          active: data.active,
          updatedAt: sql`now()`,
        })
        .where(and(eq(shopMembers.shopId, data.shopId), eq(shopMembers.userId, data.userId)));

      await writeAudit(
        {
          actorId: user.id,
          action: "shop_member.active_toggled",
          targetType: "shop_member",
          targetId: existingMember.id,
          data: { shopId: data.shopId, active: data.active },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/availability");

    return { success: true, active: data.active };
  });
}
