"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser, signOut } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { userAddresses, users, type UserAddress } from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";

import { MAX_SAVED_ADDRESSES } from "./constants";
import {
  deleteAccountSchema,
  deleteSavedAddressSchema,
  savedAddressSchema,
  setDefaultAddressSchema,
  updateProfileSchema,
  updateSavedAddressSchema,
} from "./schema";

/**
 * Updates the signed-in customer's name and mobile number. The email can't
 * be changed here: it is the sign-in identity held by the auth provider.
 */
export async function updateProfile(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(updateProfileSchema, input);

    // 3. Authorize
    assertCan(user, "user:update_own", { customerId: user.id });

    // 4. Database update inside transaction with uniqueness checks
    await db.transaction(async (tx) => {
      if (data.phone) {
        const [existingPhone] = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.phone, data.phone), ne(users.id, user.id), isNull(users.deletedAt)))
          .limit(1);

        if (existingPhone) {
          const message = "That mobile number is already linked to another account.";
          throw new AppError("CONFLICT", message, { phone: [message] });
        }
      }

      await tx
        .update(users)
        .set({
          name: data.name,
          phone: data.phone ?? null,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, user.id));

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "user.profile_updated",
          targetType: "user",
          targetId: user.id,
          data: {
            hasName: !!data.name,
            hasPhone: !!data.phone,
          },
        },
        tx,
      );
    });

    revalidatePath("/account");
    revalidatePath("/account/profile");
    return { success: true };
  });
}

/**
 * Soft deletes the signed-in user's account and invalidates all active sessions.
 */
export async function deleteAccount(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    parseInput(deleteAccountSchema, input);

    // 3. Authorize
    assertCan(user, "user:delete_own", { customerId: user.id });

    // Safety rule: Users owning an active shop must transfer or delete it first
    const ownsShop = user.memberships.some((m) => m.role === "owner");
    if (ownsShop) {
      throw new AppError(
        "FORBIDDEN",
        "Please transfer or close your shops before deleting your account.",
      );
    }

    // 4. Transaction: mark user deleted and delete saved addresses
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          deletedAt: sql`now()`,
          status: "suspended",
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, user.id));

      await tx.delete(userAddresses).where(eq(userAddresses.userId, user.id));

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "user.account_deleted",
          targetType: "user",
          targetId: user.id,
        },
        tx,
      );
    });

    // Invalidate all sessions globally
    await signOut("global");
    return { success: true };
  });
}

/**
 * Creates a new saved address for the customer.
 */
export async function createSavedAddress(input: unknown): Promise<ActionResult<UserAddress>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const data = parseInput(savedAddressSchema, input);

    // 3. Authorize
    assertCan(user, "address:manage_own", { customerId: user.id });

    // 4. Transaction
    const address = await db.transaction(async (tx) => {
      // Lock the user's row so two saves at once can't both pass the limit.
      await tx.execute(sql`select 1 from ${users} where ${users.id} = ${user.id} for update`);

      // Check existing count; if first address, automatically set as default
      const [countResult] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(userAddresses)
        .where(eq(userAddresses.userId, user.id));

      const count = countResult?.count ?? 0;
      if (count >= MAX_SAVED_ADDRESSES) {
        throw new AppError(
          "CONFLICT",
          `You can save up to ${MAX_SAVED_ADDRESSES} addresses. Delete one to add another.`,
        );
      }

      const isFirst = count === 0;
      const shouldBeDefault = data.isDefault || isFirst;

      if (shouldBeDefault) {
        await tx
          .update(userAddresses)
          .set({ isDefault: false, updatedAt: sql`now()` })
          .where(eq(userAddresses.userId, user.id));
      }

      const [created] = await tx
        .insert(userAddresses)
        .values({
          userId: user.id,
          label: data.label,
          recipientName: data.recipientName ?? null,
          phone: data.phone ?? null,
          streetAddress: data.streetAddress,
          cityId: data.cityId ?? null,
          barangayId: data.barangayId ?? null,
          notes: data.notes ?? null,
          isDefault: shouldBeDefault,
        })
        .returning();

      if (!created) {
        throw new AppError("INTERNAL");
      }

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "address.created",
          targetType: "user_address",
          targetId: created.id,
        },
        tx,
      );

      return created;
    });

    revalidatePath("/account/addresses");
    return address;
  });
}

/**
 * Updates an existing saved address.
 */
export async function updateSavedAddress(input: unknown): Promise<ActionResult<UserAddress>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const { id, ...data } = parseInput(updateSavedAddressSchema, input);

    // 3. Authorize
    assertCan(user, "address:manage_own", { customerId: user.id });

    // 4. Transaction
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", "Saved address not found.");
      }

      if (data.isDefault && !existing.isDefault) {
        await tx
          .update(userAddresses)
          .set({ isDefault: false, updatedAt: sql`now()` })
          .where(eq(userAddresses.userId, user.id));
      }

      const [saved] = await tx
        .update(userAddresses)
        .set({
          label: data.label,
          recipientName: data.recipientName ?? null,
          phone: data.phone ?? null,
          streetAddress: data.streetAddress,
          cityId: data.cityId ?? null,
          barangayId: data.barangayId ?? null,
          notes: data.notes ?? null,
          isDefault: data.isDefault,
          updatedAt: sql`now()`,
        })
        .where(eq(userAddresses.id, id))
        .returning();

      if (!saved) {
        throw new AppError("INTERNAL");
      }

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "address.updated",
          targetType: "user_address",
          targetId: id,
        },
        tx,
      );

      return saved;
    });

    revalidatePath("/account/addresses");
    return updated;
  });
}

/**
 * Deletes a saved address. If default was deleted, promotes the next one to default.
 */
export async function deleteSavedAddress(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const { id } = parseInput(deleteSavedAddressSchema, input);

    // 3. Authorize
    assertCan(user, "address:manage_own", { customerId: user.id });

    // 4. Transaction
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", "Saved address not found.");
      }

      await tx.delete(userAddresses).where(eq(userAddresses.id, id));

      // If deleted was default, promote the newest remaining address
      if (existing.isDefault) {
        const [nextDefault] = await tx
          .select({ id: userAddresses.id })
          .from(userAddresses)
          .where(eq(userAddresses.userId, user.id))
          .orderBy(desc(userAddresses.createdAt))
          .limit(1);

        if (nextDefault) {
          await tx
            .update(userAddresses)
            .set({ isDefault: true, updatedAt: sql`now()` })
            .where(eq(userAddresses.id, nextDefault.id));
        }
      }

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "address.deleted",
          targetType: "user_address",
          targetId: id,
        },
        tx,
      );
    });

    revalidatePath("/account/addresses");
    return { success: true };
  });
}

/**
 * Sets a saved address as the default address.
 */
export async function setDefaultAddress(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const { id } = parseInput(setDefaultAddressSchema, input);

    // 3. Authorize
    assertCan(user, "address:manage_own", { customerId: user.id });

    // 4. Transaction
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", "Saved address not found.");
      }

      await tx
        .update(userAddresses)
        .set({ isDefault: false, updatedAt: sql`now()` })
        .where(eq(userAddresses.userId, user.id));

      await tx
        .update(userAddresses)
        .set({ isDefault: true, updatedAt: sql`now()` })
        .where(eq(userAddresses.id, id));

      // 5. Audit log
      await writeAudit(
        {
          actorId: user.id,
          action: "address.set_default",
          targetType: "user_address",
          targetId: id,
        },
        tx,
      );
    });

    revalidatePath("/account/addresses");
    return { success: true };
  });
}
