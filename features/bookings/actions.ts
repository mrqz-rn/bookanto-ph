"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { bookingEvents, bookings, services, shopMembers } from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";

import {
  acceptBookingSchema,
  addWalkInSchema,
  assignStaffSchema,
  cancelBookingSchema,
  completeBookingSchema,
  declineBookingSchema,
  markNoShowSchema,
} from "./schema";

function generateRefCode(prefix = "BK"): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = `${prefix}-`;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Accepts a pending booking request and confirms the appointment.
 * Optionally assigns or updates the staff member handling it.
 */
export async function acceptBooking(
  input: unknown,
): Promise<ActionResult<{ success: true; bookingId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(acceptBookingSchema, input);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "booking:accept", {
      shopId: existing.shopId,
      assignedStaffId: existing.staffId,
    });

    if (existing.status !== "requested") {
      throw new AppError(
        "CONFLICT",
        `Cannot accept booking with status '${existing.status}'. It must be in 'requested' status.`,
      );
    }

    await db.transaction(async (tx) => {
      // Validate staffId belongs to shop if provided
      if (data.staffId) {
        const [member] = await tx
          .select()
          .from(shopMembers)
          .where(
            and(
              eq(shopMembers.shopId, existing.shopId),
              eq(shopMembers.userId, data.staffId),
              eq(shopMembers.active, true),
            ),
          )
          .limit(1);

        if (!member) {
          throw new AppError(
            "VALIDATION",
            "Selected staff member is not an active member of this shop.",
          );
        }
      }

      await tx
        .update(bookings)
        .set({
          status: "confirmed",
          staffId: data.staffId ?? existing.staffId,
          updatedAt: sql`now()`,
        })
        .where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingEvents).values({
        bookingId: data.bookingId,
        fromStatus: "requested",
        toStatus: "confirmed",
        actorId: user.id,
        reason: "Accepted by shop",
      });

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.accepted",
          targetType: "booking",
          targetId: data.bookingId,
          data: { shopId: existing.shopId, staffId: data.staffId ?? existing.staffId },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");

    return { success: true, bookingId: data.bookingId };
  });
}

/**
 * Declines a pending booking request with a required reason.
 */
export async function declineBooking(
  input: unknown,
): Promise<ActionResult<{ success: true; bookingId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(declineBookingSchema, input);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "booking:decline", {
      shopId: existing.shopId,
      assignedStaffId: existing.staffId,
    });

    if (existing.status !== "requested") {
      throw new AppError(
        "CONFLICT",
        `Cannot decline booking with status '${existing.status}'. It must be in 'requested' status.`,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "declined",
          updatedAt: sql`now()`,
        })
        .where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingEvents).values({
        bookingId: data.bookingId,
        fromStatus: "requested",
        toStatus: "declined",
        actorId: user.id,
        reason: data.reason,
      });

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.declined",
          targetType: "booking",
          targetId: data.bookingId,
          data: { shopId: existing.shopId, reason: data.reason },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");

    return { success: true, bookingId: data.bookingId };
  });
}

/**
 * Marks a confirmed booking as completed after service has been rendered.
 */
export async function completeBooking(
  input: unknown,
): Promise<ActionResult<{ success: true; bookingId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(completeBookingSchema, input);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "booking:complete", {
      shopId: existing.shopId,
      assignedStaffId: existing.staffId,
    });

    if (existing.status !== "confirmed") {
      throw new AppError(
        "CONFLICT",
        `Cannot complete booking with status '${existing.status}'. Only confirmed bookings can be completed.`,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "completed",
          updatedAt: sql`now()`,
        })
        .where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingEvents).values({
        bookingId: data.bookingId,
        fromStatus: "confirmed",
        toStatus: "completed",
        actorId: user.id,
        reason: "Completed service",
      });

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.completed",
          targetType: "booking",
          targetId: data.bookingId,
          data: { shopId: existing.shopId },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/reports");

    return { success: true, bookingId: data.bookingId };
  });
}

/**
 * Marks a confirmed booking as a no-show when the customer misses their appointment.
 */
export async function markNoShow(
  input: unknown,
): Promise<ActionResult<{ success: true; bookingId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(markNoShowSchema, input);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "booking:no_show", {
      shopId: existing.shopId,
      assignedStaffId: existing.staffId,
    });

    if (existing.status !== "confirmed") {
      throw new AppError(
        "CONFLICT",
        `Cannot mark booking with status '${existing.status}' as no-show.`,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "no_show",
          updatedAt: sql`now()`,
        })
        .where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingEvents).values({
        bookingId: data.bookingId,
        fromStatus: "confirmed",
        toStatus: "no_show",
        actorId: user.id,
        reason: "Customer did not arrive",
      });

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.no_show",
          targetType: "booking",
          targetId: data.bookingId,
          data: { shopId: existing.shopId },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/reports");

    return { success: true, bookingId: data.bookingId };
  });
}

/**
 * Cancels a booking (requested, quoted, or confirmed) with a reason.
 */
export async function cancelBooking(
  input: unknown,
): Promise<ActionResult<{ success: true; bookingId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(cancelBookingSchema, input);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "booking:cancel", {
      shopId: existing.shopId,
      assignedStaffId: existing.staffId,
    });

    const cancellableStatuses = ["requested", "quoted", "confirmed"];
    if (!cancellableStatuses.includes(existing.status)) {
      throw new AppError(
        "CONFLICT",
        `Cannot cancel booking with status '${existing.status}'. Only pending or confirmed bookings can be cancelled.`,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "cancelled",
          updatedAt: sql`now()`,
        })
        .where(eq(bookings.id, data.bookingId));

      await tx.insert(bookingEvents).values({
        bookingId: data.bookingId,
        fromStatus: existing.status,
        toStatus: "cancelled",
        actorId: user.id,
        reason: data.reason,
      });

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.cancelled",
          targetType: "booking",
          targetId: data.bookingId,
          data: { shopId: existing.shopId, reason: data.reason },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");

    return { success: true, bookingId: data.bookingId };
  });
}

/**
 * Adds an instant walk-in booking without requiring a registered customer account.
 */
export async function addWalkIn(
  input: unknown,
): Promise<ActionResult<{ bookingId: string; refCode: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(addWalkInSchema, input);

    assertCan(user, "booking:walk_in", { shopId: data.shopId });

    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, data.serviceId), eq(services.shopId, data.shopId)))
      .limit(1);

    if (!service) {
      throw new AppError("NOT_FOUND", "Selected service was not found in this shop.");
    }

    if (!service.active) {
      throw new AppError("VALIDATION", "Selected service is currently inactive.");
    }

    // Validate staff member belongs to shop if provided
    if (data.staffId) {
      const [member] = await db
        .select()
        .from(shopMembers)
        .where(
          and(
            eq(shopMembers.shopId, data.shopId),
            eq(shopMembers.userId, data.staffId),
            eq(shopMembers.active, true),
          ),
        )
        .limit(1);

      if (!member) {
        throw new AppError(
          "VALIDATION",
          "Selected staff member is not an active member of this shop.",
        );
      }
    }

    const startAt = new Date(data.startAt);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
    const totalCentavos = data.priceCentavos ?? service.priceCentavos ?? 0;
    const refCode = generateRefCode("BK-W");

    // Format customer details cleanly in notes
    const guestLabel = data.customerName?.trim() || "Walk-in Guest";
    const guestPhone = data.customerPhone ? ` · ${data.customerPhone}` : "";
    const extraNotes = data.notes?.trim() ? ` · Notes: ${data.notes.trim()}` : "";
    const combinedNotes = `Walk-in: ${guestLabel}${guestPhone}${extraNotes}`;

    const newBooking = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(bookings)
        .values({
          refCode,
          shopId: data.shopId,
          serviceId: data.serviceId,
          staffId: data.staffId ?? null,
          customerId: null, // Walk-in has no customer user account
          startAt,
          endAt,
          status: data.status,
          totalCentavos,
          notes: combinedNotes,
        })
        .returning();

      if (!created) {
        throw new AppError("INTERNAL", "Failed to create walk-in booking.");
      }

      await tx.insert(bookingEvents).values({
        bookingId: created.id,
        fromStatus: null,
        toStatus: data.status,
        actorId: user.id,
        reason: "Walk-in client created by shop staff",
      });

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.walk_in_created",
          targetType: "booking",
          targetId: created.id,
          data: {
            shopId: data.shopId,
            serviceId: data.serviceId,
            refCode: created.refCode,
            status: data.status,
          },
        },
        tx,
      );

      return created;
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/walk-ins");
    revalidatePath("/dashboard/reports");

    return { bookingId: newBooking.id, refCode: newBooking.refCode };
  });
}

/**
 * Assigns or reassigns a staff member to an existing booking.
 */
export async function assignStaff(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(assignStaffSchema, input);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "booking:accept", {
      shopId: existing.shopId,
      assignedStaffId: existing.staffId,
    });

    const [member] = await db
      .select()
      .from(shopMembers)
      .where(
        and(
          eq(shopMembers.shopId, existing.shopId),
          eq(shopMembers.userId, data.staffId),
          eq(shopMembers.active, true),
        ),
      )
      .limit(1);

    if (!member) {
      throw new AppError(
        "VALIDATION",
        "Staff member does not exist or is not active in this shop.",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          staffId: data.staffId,
          updatedAt: sql`now()`,
        })
        .where(eq(bookings.id, data.bookingId));

      await writeAudit(
        {
          actorId: user.id,
          action: "booking.staff_assigned",
          targetType: "booking",
          targetId: data.bookingId,
          data: { shopId: existing.shopId, staffId: data.staffId },
        },
        tx,
      );
    });

    revalidateTag(CACHE_TAGS.shops);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/calendar");

    return { success: true };
  });
}
