"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  media,
  memberships,
  packageItems,
  packages,
  serviceAddons,
  services,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";

import {
  addServicePhotoSchema,
  applyServiceTemplatesSchema,
  archiveServiceSchema,
  bulkImportServicesSchema,
  createMembershipSchema,
  createPackageSchema,
  createServiceAddonSchema,
  createServiceSchema,
  deleteMembershipSchema,
  deletePackageSchema,
  deleteServiceAddonSchema,
  deleteServiceSchema,
  removeServicePhotoSchema,
  reorderServicesSchema,
  updateMembershipSchema,
  updatePackageSchema,
  updateServiceAddonSchema,
  updateServiceSchema,
} from "./schema";

/**
 * Creates a new service offering for a shop.
 */
export async function createService(input: unknown): Promise<ActionResult<{ serviceId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createServiceSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    const newService = await db.transaction(async (tx) => {
      // Find current max sortOrder
      const [maxOrder] = await tx
        .select({ max: sql<number>`coalesce(max(${services.sortOrder}), 0)` })
        .from(services)
        .where(eq(services.shopId, data.shopId));

      const nextOrder = (maxOrder?.max ?? 0) + 1;

      const [created] = await tx
        .insert(services)
        .values({
          shopId: data.shopId,
          categoryId: data.categoryId ?? null,
          name: data.name,
          description: data.description ?? null,
          priceType: data.priceType,
          priceCentavos: data.priceType === "quote" ? null : data.priceCentavos,
          durationMin: data.durationMin,
          bookingType: data.bookingType,
          capacity: data.capacity,
          bufferMin: data.bufferMin,
          active: data.active,
          sortOrder: nextOrder,
        })
        .returning();

      if (!created) {
        throw new AppError("INTERNAL", "Failed to create service.");
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "service.create",
          targetType: "service",
          targetId: created.id,
          data: { name: created.name, shopId: data.shopId },
        },
        tx,
      );

      return created;
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { serviceId: newService.id };
  });
}

/**
 * Updates an existing service.
 */
export async function updateService(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateServiceSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(services)
        .where(and(eq(services.id, data.serviceId), eq(services.shopId, data.shopId)))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", "Service not found.");
      }

      await tx
        .update(services)
        .set({
          name: data.name,
          description: data.description ?? null,
          categoryId: data.categoryId ?? null,
          priceType: data.priceType,
          priceCentavos: data.priceType === "quote" ? null : data.priceCentavos,
          durationMin: data.durationMin,
          bookingType: data.bookingType,
          capacity: data.capacity,
          bufferMin: data.bufferMin,
          active: data.active,
          updatedAt: sql`now()`,
        })
        .where(eq(services.id, data.serviceId));

      await writeAudit(
        {
          actorId: user.id,
          action: "service.update",
          targetType: "service",
          targetId: data.serviceId,
          data: { name: data.name, shopId: data.shopId },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true };
  });
}

/**
 * Reorders services for custom display sequencing.
 */
export async function reorderServices(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(reorderServicesSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      for (let i = 0; i < data.serviceIds.length; i++) {
        const id = data.serviceIds[i];
        if (id) {
          await tx
            .update(services)
            .set({ sortOrder: i, updatedAt: sql`now()` })
            .where(and(eq(services.id, id), eq(services.shopId, data.shopId)));
        }
      }
    });

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Activates or archives a service.
 */
export async function archiveService(
  input: unknown,
): Promise<ActionResult<{ success: true; active: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(archiveServiceSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db
      .update(services)
      .set({ active: data.active, updatedAt: sql`now()` })
      .where(and(eq(services.id, data.serviceId), eq(services.shopId, data.shopId)));

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true, active: data.active };
  });
}

/**
 * Deletes a service if permitted.
 */
export async function deleteService(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(deleteServiceSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: services.id, name: services.name })
        .from(services)
        .where(and(eq(services.id, data.serviceId), eq(services.shopId, data.shopId)))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", "Service not found.");
      }

      await tx.delete(services).where(eq(services.id, data.serviceId));

      await writeAudit(
        {
          actorId: user.id,
          action: "service.delete",
          targetType: "service",
          targetId: data.serviceId,
          data: { name: existing.name },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true };
  });
}

/**
 * Associates a photo with a service.
 */
export async function addServicePhoto(input: unknown): Promise<ActionResult<{ mediaId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(addServicePhotoSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    const [created] = await db
      .insert(media)
      .values({
        ownerType: "service",
        ownerId: data.serviceId,
        path: data.path,
        kind: "photo",
        sortOrder: data.sortOrder,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Could not save service photo.");
    }

    revalidateTag(CACHE_TAGS.shops);
    return { mediaId: created.id };
  });
}

/**
 * Removes a photo from a service.
 */
export async function removeServicePhoto(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(removeServicePhotoSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db
      .delete(media)
      .where(
        and(
          eq(media.id, data.mediaId),
          eq(media.ownerType, "service"),
          eq(media.ownerId, data.serviceId),
        ),
      );

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Creates an add-on for a service.
 */
export async function createServiceAddon(
  input: unknown,
): Promise<ActionResult<{ addonId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createServiceAddonSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    const [created] = await db
      .insert(serviceAddons)
      .values({
        serviceId: data.serviceId,
        name: data.name,
        description: data.description ?? null,
        priceCentavos: data.priceCentavos,
        durationMin: data.durationMin,
        active: data.active,
        sortOrder: data.sortOrder,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Failed to create service add-on.");
    }

    revalidateTag(CACHE_TAGS.shops);
    return { addonId: created.id };
  });
}

/**
 * Updates an add-on.
 */
export async function updateServiceAddon(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateServiceAddonSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db
      .update(serviceAddons)
      .set({
        name: data.name,
        description: data.description ?? null,
        priceCentavos: data.priceCentavos,
        durationMin: data.durationMin,
        active: data.active,
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: sql`now()`,
      })
      .where(eq(serviceAddons.id, data.addonId));

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Deletes an add-on.
 */
export async function deleteServiceAddon(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(deleteServiceAddonSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db.delete(serviceAddons).where(eq(serviceAddons.id, data.addonId));

    revalidateTag(CACHE_TAGS.shops);
    return { success: true };
  });
}

/**
 * Applies selected pre-built category service templates to the shop in bulk.
 */
export async function applyCategoryTemplates(
  input: unknown,
): Promise<ActionResult<{ addedCount: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(applyServiceTemplatesSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    let addedCount = 0;

    await db.transaction(async (tx) => {
      const [maxOrder] = await tx
        .select({ max: sql<number>`coalesce(max(${services.sortOrder}), 0)` })
        .from(services)
        .where(eq(services.shopId, data.shopId));

      let currentOrder = (maxOrder?.max ?? 0) + 1;

      for (const tpl of data.templates) {
        const [created] = await tx
          .insert(services)
          .values({
            shopId: data.shopId,
            categoryId: data.categoryId ?? null,
            name: tpl.name,
            description: tpl.description ?? null,
            priceType: tpl.priceType,
            priceCentavos: tpl.priceType === "quote" ? null : tpl.priceCentavos,
            durationMin: tpl.durationMin,
            bookingType: tpl.bookingType,
            capacity: tpl.capacity ?? 1,
            bufferMin: tpl.bufferMin ?? 0,
            active: true,
            sortOrder: currentOrder++,
          })
          .returning();

        if (created && tpl.suggestedAddons && tpl.suggestedAddons.length > 0) {
          for (const addon of tpl.suggestedAddons) {
            await tx.insert(serviceAddons).values({
              serviceId: created.id,
              name: addon.name,
              description: addon.description ?? null,
              priceCentavos: addon.priceCentavos,
              durationMin: addon.durationMin,
              active: true,
            });
          }
        }

        addedCount++;
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "service.apply_templates",
          targetType: "shop",
          targetId: data.shopId,
          data: { addedCount },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { addedCount };
  });
}

/**
 * Bulk imports an array of services (from CSV/JSON) in a single transactional batch.
 */
export async function bulkImportServices(
  input: unknown,
): Promise<ActionResult<{ importedCount: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(bulkImportServicesSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    let importedCount = 0;

    await db.transaction(async (tx) => {
      const [maxOrder] = await tx
        .select({ max: sql<number>`coalesce(max(${services.sortOrder}), 0)` })
        .from(services)
        .where(eq(services.shopId, data.shopId));

      let currentOrder = (maxOrder?.max ?? 0) + 1;

      for (const item of data.services) {
        await tx.insert(services).values({
          shopId: data.shopId,
          categoryId: data.categoryId ?? null,
          name: item.name,
          description: item.description ?? null,
          priceType: item.priceType,
          priceCentavos: item.priceType === "quote" ? null : item.priceCentavos,
          durationMin: item.durationMin,
          bookingType: item.bookingType,
          capacity: item.capacity,
          bufferMin: item.bufferMin,
          active: true,
          sortOrder: currentOrder++,
        });

        importedCount++;
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "service.bulk_import",
          targetType: "shop",
          targetId: data.shopId,
          data: { importedCount },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { importedCount };
  });
}

/**
 * Creates a service package bundle.
 */
export async function createPackage(input: unknown): Promise<ActionResult<{ packageId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createPackageSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    const newPkg = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(packages)
        .values({
          shopId: data.shopId,
          name: data.name,
          description: data.description ?? null,
          priceCentavos: data.priceCentavos,
          originalPriceCentavos: data.originalPriceCentavos ?? null,
          active: data.active,
        })
        .returning();

      if (!created) {
        throw new AppError("INTERNAL", "Failed to create package.");
      }

      for (const item of data.serviceItems) {
        await tx.insert(packageItems).values({
          packageId: created.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
        });
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "package.create",
          targetType: "package",
          targetId: created.id,
          data: { name: created.name, shopId: data.shopId },
        },
        tx,
      );

      return created;
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { packageId: newPkg.id };
  });
}

/**
 * Updates a package bundle and its service items.
 */
export async function updatePackage(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updatePackageSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db.transaction(async (tx) => {
      await tx
        .update(packages)
        .set({
          name: data.name,
          description: data.description ?? null,
          priceCentavos: data.priceCentavos,
          originalPriceCentavos: data.originalPriceCentavos ?? null,
          active: data.active,
          updatedAt: sql`now()`,
        })
        .where(and(eq(packages.id, data.packageId), eq(packages.shopId, data.shopId)));

      await tx.delete(packageItems).where(eq(packageItems.packageId, data.packageId));

      for (const item of data.serviceItems) {
        await tx.insert(packageItems).values({
          packageId: data.packageId,
          serviceId: item.serviceId,
          quantity: item.quantity,
        });
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "package.update",
          targetType: "package",
          targetId: data.packageId,
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true };
  });
}

/**
 * Deletes a package.
 */
export async function deletePackage(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(deletePackageSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db
      .delete(packages)
      .where(and(eq(packages.id, data.packageId), eq(packages.shopId, data.shopId)));

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true };
  });
}

/**
 * Creates a membership plan or session pass.
 */
export async function createMembership(
  input: unknown,
): Promise<ActionResult<{ membershipId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createMembershipSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    const [created] = await db
      .insert(memberships)
      .values({
        shopId: data.shopId,
        name: data.name,
        description: data.description ?? null,
        priceCentavos: data.priceCentavos,
        cadence: data.cadence,
        sessionCredits: data.sessionCredits ?? null,
        validityDays: data.validityDays ?? null,
        perks: data.perks ?? null,
        active: data.active,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL", "Failed to create membership plan.");
    }

    await writeAudit({
      actorId: user.id,
      action: "membership.create",
      targetType: "membership",
      targetId: created.id,
      data: { name: created.name, shopId: data.shopId },
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { membershipId: created.id };
  });
}

/**
 * Updates a membership plan.
 */
export async function updateMembership(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(updateMembershipSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db
      .update(memberships)
      .set({
        name: data.name,
        description: data.description ?? null,
        priceCentavos: data.priceCentavos,
        cadence: data.cadence,
        sessionCredits: data.sessionCredits ?? null,
        validityDays: data.validityDays ?? null,
        perks: data.perks ?? null,
        active: data.active,
        updatedAt: sql`now()`,
      })
      .where(and(eq(memberships.id, data.membershipId), eq(memberships.shopId, data.shopId)));

    await writeAudit({
      actorId: user.id,
      action: "membership.update",
      targetType: "membership",
      targetId: data.membershipId,
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true };
  });
}

/**
 * Deletes a membership plan.
 */
export async function deleteMembership(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(deleteMembershipSchema, input);
    assertCan(user, "service:manage", { shopId: data.shopId });

    await db
      .delete(memberships)
      .where(and(eq(memberships.id, data.membershipId), eq(memberships.shopId, data.shopId)));

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard/services");

    return { success: true };
  });
}
