"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import { writeAudit } from "@/lib/audit";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { assertCan, can } from "@/lib/authz";
import { availabilityTag, CACHE_TAGS } from "@/lib/cache";
import { db, type DbExecutor } from "@/lib/db";
import {
  businessHours,
  closures,
  shopHolidayRules,
  shopMembers,
  staffHours,
  staffSchedules,
  staffTimeOff,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { manilaDate, manilaToUtc } from "@/lib/time";

import { BOOKING_HORIZON_DAYS } from "./constants";
import { computeOpenSlots, countHeldBookings, getSlotService } from "./queries";
import {
  addClosureSchema,
  addTimeOffSchema,
  getOpenSlotsSchema,
  removeClosureSchema,
  removeTimeOffSchema,
  setHolidayRulesSchema,
  setHoursSchema,
  setStaffScheduleSchema,
} from "./schema";
import { addDays, type SlotDay } from "./slots";

const DASHBOARD_PATH = "/dashboard/availability";

/**
 * Refreshes everything that shows the shop's schedule: the slot engine's
 * cache, the dashboard, and (for shop-wide changes) public shop pages.
 */
function revalidateSchedule(shopId: string, { publicPages }: { publicPages: boolean }) {
  revalidateTag(availabilityTag(shopId));
  if (publicPages) revalidateTag(CACHE_TAGS.shops);
  revalidatePath(DASHBOARD_PATH);
}

type RangeInput = {
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

/** Manila dates and times from the form, as the UTC instants the database stores. */
function toInstants(range: RangeInput, now: Date): { startsAt: Date; endsAt: Date } {
  const startsAt = range.allDay
    ? manilaToUtc(range.startDate)
    : manilaToUtc(range.startDate, range.startTime!);
  const endsAt = range.allDay
    ? manilaToUtc(addDays(range.endDate, 1))
    : manilaToUtc(range.endDate, range.endTime!);
  if (endsAt <= startsAt) {
    throw new AppError("VALIDATION", "The end is before the start.", {
      endTime: ["The end is before the start."],
    });
  }
  if (endsAt <= now) {
    throw new AppError("VALIDATION", "That time has already passed.", {
      endDate: ["That time has already passed."],
    });
  }
  return { startsAt, endsAt };
}

/** Throws NOT_FOUND unless the user is an active member of the shop. */
async function assertActiveMember(executor: DbExecutor, shopId: string, userId: string) {
  const [member] = await executor
    .select({ id: shopMembers.id })
    .from(shopMembers)
    .where(
      and(
        eq(shopMembers.shopId, shopId),
        eq(shopMembers.userId, userId),
        eq(shopMembers.active, true),
      ),
    )
    .limit(1);
  if (!member) throw new AppError("NOT_FOUND", "That staff member isn't part of this shop.");
}

/** Replaces the shop's weekly hours. Weekdays left out are closed. */
export async function setHours(input: unknown): Promise<ActionResult<{ openDays: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, hours } = parseInput(setHoursSchema, input);
    assertCan(user, "shop:update", { shopId });

    await db.transaction(async (tx) => {
      await tx.delete(businessHours).where(eq(businessHours.shopId, shopId));
      if (hours.length > 0) {
        await tx.insert(businessHours).values(hours.map((day) => ({ shopId, ...day })));
      }
      await writeAudit(
        {
          actorId: user.id,
          action: "availability.hours_set",
          targetType: "shop",
          targetId: shopId,
          data: { openDays: hours.map((day) => day.weekday) },
        },
        tx,
      );
    });

    revalidateSchedule(shopId, { publicPages: true });
    return { openDays: hours.length };
  });
}

/** Closes the whole shop for a range of days or hours. */
export async function addClosure(
  input: unknown,
): Promise<ActionResult<{ id: string; heldBookings: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, reason, ...range } = parseInput(addClosureSchema, input);
    assertCan(user, "shop:update", { shopId });
    const { startsAt, endsAt } = toInstants(range, new Date());

    const result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(closures)
        .values({ shopId, startsAt, endsAt, reason })
        .returning({ id: closures.id });
      if (!created) throw new AppError("INTERNAL");

      // Bookings already made stay; the shop sees how many to sort out.
      const heldBookings = await countHeldBookings(tx, { shopId, start: startsAt, end: endsAt });
      await writeAudit(
        {
          actorId: user.id,
          action: "availability.closure_added",
          targetType: "shop",
          targetId: shopId,
          data: { closureId: created.id, startsAt, endsAt, heldBookings },
        },
        tx,
      );
      return { id: created.id, heldBookings };
    });

    revalidateSchedule(shopId, { publicPages: true });
    return result;
  });
}

export async function removeClosure(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, closureId } = parseInput(removeClosureSchema, input);
    assertCan(user, "shop:update", { shopId });

    await db.transaction(async (tx) => {
      const [removed] = await tx
        .delete(closures)
        .where(and(eq(closures.id, closureId), eq(closures.shopId, shopId)))
        .returning({ id: closures.id });
      if (!removed) throw new AppError("NOT_FOUND", "That closure is already gone.");
      await writeAudit(
        {
          actorId: user.id,
          action: "availability.closure_removed",
          targetType: "shop",
          targetId: shopId,
          data: { closureId },
        },
        tx,
      );
    });

    revalidateSchedule(shopId, { publicPages: true });
    return { id: closureId };
  });
}

/** Blocks time for one staff member (leave, errands). The shop stays open. */
export async function addTimeOff(
  input: unknown,
): Promise<ActionResult<{ id: string; heldBookings: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, userId, reason, ...range } = parseInput(addTimeOffSchema, input);
    assertCan(user, "schedule:block", { shopId });
    const { startsAt, endsAt } = toInstants(range, new Date());

    const result = await db.transaction(async (tx) => {
      await assertActiveMember(tx, shopId, userId);
      const [created] = await tx
        .insert(staffTimeOff)
        .values({ shopId, userId, startsAt, endsAt, reason })
        .returning({ id: staffTimeOff.id });
      if (!created) throw new AppError("INTERNAL");

      const heldBookings = await countHeldBookings(tx, {
        shopId,
        start: startsAt,
        end: endsAt,
        staffId: userId,
      });
      await writeAudit(
        {
          actorId: user.id,
          action: "availability.time_off_added",
          targetType: "shop",
          targetId: shopId,
          data: { timeOffId: created.id, staffId: userId, startsAt, endsAt, heldBookings },
        },
        tx,
      );
      return { id: created.id, heldBookings };
    });

    revalidateSchedule(shopId, { publicPages: false });
    return result;
  });
}

export async function removeTimeOff(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, timeOffId } = parseInput(removeTimeOffSchema, input);
    assertCan(user, "schedule:block", { shopId });

    await db.transaction(async (tx) => {
      const [removed] = await tx
        .delete(staffTimeOff)
        .where(and(eq(staffTimeOff.id, timeOffId), eq(staffTimeOff.shopId, shopId)))
        .returning({ id: staffTimeOff.id, staffId: staffTimeOff.userId });
      if (!removed) throw new AppError("NOT_FOUND", "That time off is already gone.");
      await writeAudit(
        {
          actorId: user.id,
          action: "availability.time_off_removed",
          targetType: "shop",
          targetId: shopId,
          data: { timeOffId, staffId: removed.staffId },
        },
        tx,
      );
    });

    revalidateSchedule(shopId, { publicPages: false });
    return { id: timeOffId };
  });
}

/**
 * Replaces the shop's holiday rules. They apply every year: the holiday
 * calendar supplies each year's dates.
 */
export async function setHolidayRules(
  input: unknown,
): Promise<ActionResult<{ closedOn: number; specialHours: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, rules } = parseInput(setHolidayRulesSchema, input);
    assertCan(user, "shop:update", { shopId });

    await db.transaction(async (tx) => {
      await tx.delete(shopHolidayRules).where(eq(shopHolidayRules.shopId, shopId));
      if (rules.length > 0) {
        await tx.insert(shopHolidayRules).values(rules.map((rule) => ({ shopId, ...rule })));
      }
      await writeAudit(
        {
          actorId: user.id,
          action: "availability.holiday_rules_set",
          targetType: "shop",
          targetId: shopId,
          data: { rules: rules.map((rule) => rule.holidayKey) },
        },
        tx,
      );
    });

    revalidateSchedule(shopId, { publicPages: true });
    const closedOn = rules.filter((rule) => !rule.opens).length;
    return { closedOn, specialHours: rules.length - closedOn };
  });
}

/**
 * Sets whether a member takes bookings and when they work: the shop's hours,
 * or their own weekly hours (which still need the shop to be open).
 */
export async function setStaffSchedule(
  input: unknown,
): Promise<ActionResult<{ takesBookings: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, userId, takesBookings, usesShopHours, hours } = parseInput(
      setStaffScheduleSchema,
      input,
    );
    assertCan(user, "shop:update", { shopId });

    await db.transaction(async (tx) => {
      await assertActiveMember(tx, shopId, userId);
      const member = and(eq(staffSchedules.shopId, shopId), eq(staffSchedules.userId, userId));

      if (!takesBookings) {
        // Cascades to the member's staff_hours.
        await tx.delete(staffSchedules).where(member);
      } else {
        await tx
          .insert(staffSchedules)
          .values({ shopId, userId, usesShopHours })
          .onConflictDoUpdate({
            target: [staffSchedules.shopId, staffSchedules.userId],
            set: { usesShopHours },
          });
        await tx
          .delete(staffHours)
          .where(and(eq(staffHours.shopId, shopId), eq(staffHours.userId, userId)));
        if (!usesShopHours) {
          await tx.insert(staffHours).values(hours.map((day) => ({ shopId, userId, ...day })));
        }
      }

      await writeAudit(
        {
          actorId: user.id,
          action: "availability.staff_schedule_set",
          targetType: "shop",
          targetId: shopId,
          data: {
            staffId: userId,
            takesBookings,
            usesShopHours,
            workDays: usesShopHours ? null : hours.map((day) => day.weekday),
          },
        },
        tx,
      );
    });

    revalidateSchedule(shopId, { publicPages: false });
    return { takesBookings };
  });
}

/**
 * Open start times for a service, one day or a date strip at a time. Anyone
 * may browse the slots of an active shop's active service, guests included,
 * so step 1 reads the user without requiring one. Members also see slots of
 * their own draft shop or inactive services, to preview them.
 */
export async function getOpenSlots(input: unknown): Promise<ActionResult<{ days: SlotDay[] }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    const { serviceId, date, days, staffId } = parseInput(getOpenSlotsSchema, input);

    const service = await getSlotService(serviceId);
    if (!service) throw new AppError("NOT_FOUND", "We couldn't find that service.");
    const isPublic = service.active && service.shopStatus === "active";
    if (isPublic) {
      assertCan(user, "shop:read", { shopId: service.shopId });
    } else if (!can(user, "schedule:block", { shopId: service.shopId })) {
      throw new AppError("NOT_FOUND", "We couldn't find that service.");
    }
    if (service.bookingType === "queue") {
      throw new AppError(
        "VALIDATION",
        "This service takes walk-ins by queue number, so it has no time slots.",
      );
    }

    const now = new Date();
    const today = manilaDate(now);
    const lastDay = addDays(today, BOOKING_HORIZON_DAYS);
    if (date < today || date > lastDay) {
      throw new AppError(
        "VALIDATION",
        `Pick a date from today up to ${BOOKING_HORIZON_DAYS} days ahead.`,
        { date: ["Pick another date."] },
      );
    }
    const daysLeft = (Date.parse(lastDay) - Date.parse(date)) / 86_400_000 + 1;

    return {
      days: await computeOpenSlots({
        service,
        fromDate: date,
        days: Math.min(days, daysLeft),
        staffId,
        now,
      }),
    };
  });
}
