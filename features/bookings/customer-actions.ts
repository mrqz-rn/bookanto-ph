"use server";

import { randomInt } from "node:crypto";

import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  computeOpenSlots,
  findBookableSlot,
  getSlotService,
  isShopOpenNow,
} from "@/features/availability/queries";
import type { SlotDay } from "@/features/availability/slots";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { trackServerEvent } from "@/features/analytics/server-tracker";
import { db, type DbExecutor } from "@/lib/db";
import {
  bookingEvents,
  bookingPolicies,
  bookings,
  payments,
  services,
  shops,
} from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { sendNotification, type SendNotificationOptions } from "@/lib/notify";
import { createCheckout, paymentsEnabled } from "@/lib/payments";
import { publicEnv } from "@/lib/public-env";
import { formatManila, manilaDate } from "@/lib/time";

import {
  countWaiting,
  findReusableCheckout,
  getBookingRules,
  manilaDayRange,
} from "./customer-queries";
import {
  bookingIdSchema,
  cancelMyBookingSchema,
  createBookingSchema,
  joinQueueSchema,
  rescheduleBookingSchema,
  rescheduleSlotsSchema,
  sendQuoteSchema,
  setBookingRulesSchema,
} from "./customer-schema";
import { settleRefunds } from "./payments";
import { changeBookingStatus } from "./status";
import {
  amountDueOnline,
  canCustomerCancel,
  canCustomerReschedule,
  CHECKOUT_REUSE_MIN,
  MAX_BOOKINGS_PER_DAY,
  MAX_OPEN_REQUESTS,
  quoteExpiry,
  requestExpiry,
  SAME_DAY_REQUEST_EXPIRY_MIN,
} from "./rules";

// The customer side of booking: create (slot, home, quote, queue), cancel,
// reschedule, accept a quote and pay; plus the shop's quote and booking rules.
// The shop's inbox actions (accept, decline, complete, no-show) are in actions.ts.

const MINUTE = 60_000;
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** "BK-7KQ2MX": short enough to read over the phone, no look-alike characters. */
function newRefCode(): string {
  return `BK-${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;
}

function revalidateBooking(bookingId?: string) {
  revalidatePath("/account/bookings");
  if (bookingId) revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/quotes");
}

/** Notifications never fail the action they follow. */
async function notifyQuietly(options: SendNotificationOptions) {
  try {
    await sendNotification(options);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Serializes everything that takes or moves time in one shop, so two people
 * can't be given the same slot (or queue number) at once.
 */
async function lockShop(tx: DbExecutor, shopId: string) {
  await tx.select({ id: shops.id }).from(shops).where(eq(shops.id, shopId)).for("update");
}

/** A booking this customer already made with this key (a double tap or a retry). */
async function findByIdempotencyKey(tx: DbExecutor, customerId: string, key: string) {
  const [existing] = await tx
    .select({ id: bookings.id, refCode: bookings.refCode })
    .from(bookings)
    .where(and(eq(bookings.customerId, customerId), eq(bookings.idempotencyKey, key)))
    .limit(1);
  return existing ?? null;
}

/** Plan: 10 bookings a day per customer, and a limit on unanswered requests. */
async function assertWithinLimits(tx: DbExecutor, customerId: string, now: Date) {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const [counts] = await tx
    .select({
      today: sql<number>`count(*) filter (where ${bookings.createdAt} >= ${since}::timestamptz)::int`,
      open: sql<number>`count(*) filter (where ${bookings.status} in ('requested', 'quoted'))::int`,
    })
    .from(bookings)
    .where(eq(bookings.customerId, customerId));
  if ((counts?.today ?? 0) >= MAX_BOOKINGS_PER_DAY) {
    throw new AppError(
      "RATE_LIMITED",
      "You've made a lot of bookings today. Please try again tomorrow.",
    );
  }
  if ((counts?.open ?? 0) >= MAX_OPEN_REQUESTS) {
    throw new AppError(
      "RATE_LIMITED",
      "You have several requests still waiting for an answer. Wait for a reply or cancel one first.",
    );
  }
}

async function loadBookableService(serviceId: string) {
  const service = await getSlotService(serviceId);
  if (!service || !service.active || service.shopStatus !== "active") {
    throw new AppError("NOT_FOUND", "This service isn't available for booking right now.");
  }
  return service;
}

type CreatedBooking = { bookingId: string; refCode: string };

/**
 * Books a start time for a Slot, Home or Quote service. The booking starts
 * as Requested and the shop has 2 hours (30 minutes for today) to answer.
 */
export async function createBooking(input: unknown): Promise<ActionResult<CreatedBooking>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createBookingSchema, input);
    const service = await loadBookableService(data.serviceId);
    assertCan(user, "booking:create", { shopId: service.shopId });

    if (service.bookingType === "queue") {
      throw new AppError("VALIDATION", "This service takes a queue number, not a time slot.");
    }
    if (service.bookingType === "home" && !data.address) {
      throw new AppError("VALIDATION", undefined, {
        address: ["Enter the address for the home service."],
      });
    }
    if (service.bookingType === "quote" && !data.notes) {
      throw new AppError("VALIDATION", undefined, {
        notes: ["Describe what you need so the shop can quote a price."],
      });
    }

    const now = new Date();
    const startAt = new Date(data.startAt);

    const result = await db.transaction(async (tx) => {
      await lockShop(tx, service.shopId);
      const repeat = await findByIdempotencyKey(tx, user.id, data.idempotencyKey);
      if (repeat) {
        return {
          created: repeat,
          isNew: false,
          shopName: "",
          serviceName: "",
          shopOwnerId: null,
          expiresAt: null,
        };
      }
      await assertWithinLimits(tx, user.id, now);

      const slot = await findBookableSlot(tx, {
        serviceId: service.id,
        startAt: data.startAt,
        staffId: data.staffId,
        now,
      });
      if (!slot) throw new AppError("CONFLICT");

      const [priced] = await tx
        .select({
          priceType: services.priceType,
          priceCentavos: services.priceCentavos,
          serviceName: services.name,
          shopName: shops.name,
          shopOwnerId: shops.ownerId,
        })
        .from(services)
        .innerJoin(shops, eq(shops.id, services.shopId))
        .where(eq(services.id, service.id))
        .limit(1);
      if (!priced) throw new AppError("INTERNAL", "Service pricing could not be loaded.");
      // A quote has no price until the shop sends one.
      const total =
        service.bookingType === "quote" || priced.priceType === "quote"
          ? null
          : priced.priceCentavos;
      const rules = await getBookingRules(service.shopId, tx);

      const [created] = await tx
        .insert(bookings)
        .values({
          refCode: newRefCode(),
          customerId: user.id,
          shopId: service.shopId,
          serviceId: service.id,
          // The requested person, or whoever is free, so the slot count stays exact.
          staffId: data.staffId ?? slot.staffIds[0] ?? null,
          startAt,
          endAt: new Date(slot.endAt),
          status: "requested",
          bookingType: service.bookingType,
          address: service.bookingType === "home" ? data.address : null,
          notes: data.notes,
          totalCentavos: total,
          depositCentavos: paymentsEnabled() ? amountDueOnline(rules, total) : 0,
          expiresAt: requestExpiry(now, startAt),
          idempotencyKey: data.idempotencyKey,
        })
        .returning({ id: bookings.id, refCode: bookings.refCode, expiresAt: bookings.expiresAt });
      if (!created) throw new AppError("INTERNAL", "Booking record could not be created.");

      await tx
        .insert(bookingEvents)
        .values({ bookingId: created.id, toStatus: "requested", actorId: user.id });
      return {
        created,
        isNew: true,
        shopName: priced.shopName,
        serviceName: priced.serviceName,
        shopOwnerId: priced.shopOwnerId,
        expiresAt: created.expiresAt,
      };
    });

    if (result.isNew) {
      await trackServerEvent({
        eventName: "booking_submitted",
        userId: user.id,
        shopId: service.shopId,
        serviceId: service.id,
        bookingId: result.created.id,
        step: "submit_booking",
      });
      await notifyQuietly({
        userId: user.id,
        template: "booking_requested",
        payload: {
          bookingId: result.created.id,
          refCode: result.created.refCode,
          shopName: result.shopName,
          serviceName: result.serviceName,
          startAt,
        },
      });
      // The shop owner hears about it by email too, so a request isn't missed
      // while they're away from the dashboard.
      if (result.shopOwnerId) {
        await notifyQuietly({
          userId: result.shopOwnerId,
          template: "booking_request_received",
          payload: {
            bookingId: result.created.id,
            refCode: result.created.refCode,
            shopName: result.shopName,
            serviceName: result.serviceName,
            customerName: user.name ?? undefined,
            startAt,
            expiresAt: result.expiresAt ?? undefined,
          },
        });
      }
      revalidateBooking();
    }
    return { bookingId: result.created.id, refCode: result.created.refCode };
  });
}

/**
 * Takes the next number in today's queue for a Queue service. Only while the
 * shop is open, and one number per customer per service at a time.
 */
export async function joinQueue(
  input: unknown,
): Promise<ActionResult<CreatedBooking & { queueNumber: number; ahead: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(joinQueueSchema, input);
    const service = await loadBookableService(data.serviceId);
    assertCan(user, "booking:create", { shopId: service.shopId });
    if (service.bookingType !== "queue") {
      throw new AppError("VALIDATION", "This service is booked by time slot, not by queue.");
    }

    const now = new Date();
    const day = manilaDayRange(now);
    const inTodaysQueue = and(
      eq(bookings.shopId, service.shopId),
      eq(bookings.bookingType, "queue"),
      gte(bookings.startAt, day.start),
      lt(bookings.startAt, day.end),
    );

    const result = await db.transaction(async (tx) => {
      await lockShop(tx, service.shopId);
      const repeat = await findByIdempotencyKey(tx, user.id, data.idempotencyKey);
      if (repeat) {
        const [row] = await tx
          .select({ queueNumber: bookings.queueNumber })
          .from(bookings)
          .where(eq(bookings.id, repeat.id));
        return { ...repeat, queueNumber: row?.queueNumber ?? 0, isNew: false };
      }
      await assertWithinLimits(tx, user.id, now);

      if (!(await isShopOpenNow(tx, service.shopId, now))) {
        throw new AppError("VALIDATION", "The shop is closed right now, so the queue isn't open.");
      }
      const [mine] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            inTodaysQueue,
            eq(bookings.serviceId, service.id),
            eq(bookings.customerId, user.id),
            inArray(bookings.status, ["requested", "confirmed"]),
          ),
        )
        .limit(1);
      if (mine) throw new AppError("CONFLICT", "You already have a number in this queue.");

      const [last] = await tx
        .select({ number: sql<number>`coalesce(max(${bookings.queueNumber}), 0)::int` })
        .from(bookings)
        .where(inTodaysQueue);
      const queueNumber = (last?.number ?? 0) + 1;

      const [created] = await tx
        .insert(bookings)
        .values({
          refCode: newRefCode(),
          customerId: user.id,
          shopId: service.shopId,
          serviceId: service.id,
          startAt: now,
          endAt: new Date(now.getTime() + service.durationMin * MINUTE),
          status: "requested",
          bookingType: "queue",
          queueNumber,
          notes: data.notes,
          expiresAt: new Date(now.getTime() + SAME_DAY_REQUEST_EXPIRY_MIN * MINUTE),
          idempotencyKey: data.idempotencyKey,
        })
        .returning({ id: bookings.id, refCode: bookings.refCode });
      if (!created) throw new AppError("INTERNAL");
      await tx.insert(bookingEvents).values({
        bookingId: created.id,
        toStatus: "requested",
        actorId: user.id,
        reason: `Queue number ${queueNumber}`,
      });
      return { ...created, queueNumber, isNew: true };
    });

    if (result.isNew) {
      await trackServerEvent({
        eventName: "booking_submitted",
        userId: user.id,
        shopId: service.shopId,
        serviceId: service.id,
        bookingId: result.id,
        step: "submit_booking",
      });
      revalidateBooking();
    }
    return {
      bookingId: result.id,
      refCode: result.refCode,
      queueNumber: result.queueNumber,
      ahead: await countWaiting(service.id, now, result.queueNumber),
    };
  });
}

/** The customer's own booking with what the rules need, or NOT_FOUND. */
async function loadOwnBooking(executor: DbExecutor, bookingId: string, customerId: string) {
  const [booking] = await executor
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      customerId: bookings.customerId,
      shopId: bookings.shopId,
      serviceId: bookings.serviceId,
      staffId: bookings.staffId,
      status: bookings.status,
      bookingType: bookings.bookingType,
      startAt: bookings.startAt,
      expiresAt: bookings.expiresAt,
      rescheduleCount: bookings.rescheduleCount,
      quotedPriceCentavos: bookings.quotedPriceCentavos,
      depositCentavos: bookings.depositCentavos,
      paidCentavos: bookings.paidCentavos,
      shopName: shops.name,
      shopOwnerId: shops.ownerId,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(shops, eq(shops.id, bookings.shopId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId)))
    .limit(1);
  // Someone else's booking looks the same as one that doesn't exist.
  if (!booking) throw new AppError("NOT_FOUND", "We couldn't find that booking.");
  return booking;
}

const CHANGED_MEANWHILE = "This booking just changed. Please refresh and try again.";

/**
 * Cancels the customer's own booking. Inside the shop's cancellation window
 * a confirmed booking is marked as a late cancellation and its deposit is
 * kept; otherwise anything paid online is refunded.
 */
export async function cancelMyBooking(
  input: unknown,
): Promise<ActionResult<{ late: boolean; refunded: boolean }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId, reason } = parseInput(cancelMyBookingSchema, input);
    const booking = await loadOwnBooking(db, bookingId, user.id);
    assertCan(user, "booking:cancel_own", { customerId: booking.customerId });

    const verdict = canCustomerCancel(booking, await getBookingRules(booking.shopId), new Date());
    if (!verdict.allowed) throw new AppError("CONFLICT", verdict.reason);

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({ lateCancel: verdict.late })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, booking.status)))
        .returning({ id: bookings.id });
      if (!updated) throw new AppError("CONFLICT", CHANGED_MEANWHILE);
      await changeBookingStatus(tx, {
        bookingId,
        from: booking.status,
        to: "cancelled",
        actorId: user.id,
        reason: [verdict.late ? "Late cancellation by customer" : "Cancelled by customer", reason]
          .filter(Boolean)
          .join(": "),
      });
    });

    const refunds = booking.paidCentavos > 0 ? await settleRefunds(bookingId) : null;
    await notifyQuietly({
      userId: booking.shopOwnerId,
      template: "booking_cancelled",
      payload: {
        bookingId,
        refCode: booking.refCode,
        shopName: booking.shopName,
        serviceName: booking.serviceName,
        startAt: booking.startAt,
        reason: reason ?? undefined,
      },
    });
    revalidateBooking(bookingId);
    return { late: verdict.late, refunded: (refunds?.refunded.length ?? 0) > 0 };
  });
}

/** Open times the customer's booking could move to (its current time doesn't block itself). */
export async function getRescheduleSlots(
  input: unknown,
): Promise<ActionResult<{ days: SlotDay[] }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId, date, days, staffId } = parseInput(rescheduleSlotsSchema, input);
    const booking = await loadOwnBooking(db, bookingId, user.id);
    assertCan(user, "booking:reschedule_own", { customerId: booking.customerId });

    const service = await getSlotService(booking.serviceId);
    if (!service) throw new AppError("NOT_FOUND");
    const now = new Date();
    const today = manilaDate(now);
    const fromDate = !date || date < today ? today : date;
    return {
      days: await computeOpenSlots({
        service,
        fromDate,
        days: days ?? 14,
        staffId: staffId || null,
        now,
        ignoreBookingId: bookingId,
      }),
    };
  });
}

/**
 * Moves the customer's booking to another open time. The status stays as it
 * was: the new time is one the shop's own availability offers. A pending
 * request gets a fresh window for the shop to answer.
 */
export async function rescheduleBooking(
  input: unknown,
): Promise<ActionResult<{ startAt: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId, startAt } = parseInput(rescheduleBookingSchema, input);
    const booking = await loadOwnBooking(db, bookingId, user.id);
    assertCan(user, "booking:reschedule_own", { customerId: booking.customerId });

    const now = new Date();
    const verdict = canCustomerReschedule(booking, await getBookingRules(booking.shopId), now);
    if (!verdict.allowed) throw new AppError("CONFLICT", verdict.reason);
    const newStart = new Date(startAt);
    if (newStart.getTime() === booking.startAt.getTime()) {
      throw new AppError("VALIDATION", "That's the time you already have. Pick a different one.");
    }

    await db.transaction(async (tx) => {
      await lockShop(tx, booking.shopId);
      const slot = await findBookableSlot(tx, {
        serviceId: booking.serviceId,
        startAt,
        now,
        ignoreBookingId: bookingId,
      });
      if (!slot) throw new AppError("CONFLICT");

      // Keep the same person when they're free at the new time.
      const staffId =
        slot.staffIds.length === 0 || (booking.staffId && slot.staffIds.includes(booking.staffId))
          ? booking.staffId
          : slot.staffIds[0]!;
      const [updated] = await tx
        .update(bookings)
        .set({
          startAt: newStart,
          endAt: new Date(slot.endAt),
          staffId,
          rescheduleCount: booking.rescheduleCount + 1,
          ...(booking.status === "requested" && { expiresAt: requestExpiry(now, newStart) }),
        })
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.status, booking.status),
            eq(bookings.rescheduleCount, booking.rescheduleCount),
          ),
        )
        .returning({ id: bookings.id });
      if (!updated) throw new AppError("CONFLICT", CHANGED_MEANWHILE);
      await tx.insert(bookingEvents).values({
        bookingId,
        fromStatus: booking.status,
        toStatus: booking.status,
        actorId: user.id,
        reason: `Rescheduled by customer from ${formatManila(booking.startAt)} to ${formatManila(newStart)}`,
      });
    });

    revalidateBooking(bookingId);
    return { startAt };
  });
}

/** The shop names its price for a quote request. The customer then has the shop's quote window to accept. */
export async function sendQuote(input: unknown): Promise<ActionResult<{ expiresAt: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId, priceCentavos, note } = parseInput(sendQuoteSchema, input);
    const [booking] = await db
      .select({
        shopId: bookings.shopId,
        staffId: bookings.staffId,
        status: bookings.status,
        bookingType: bookings.bookingType,
        startAt: bookings.startAt,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    assertCan(
      user,
      "booking:quote",
      { shopId: booking?.shopId, assignedStaffId: booking?.staffId },
      { hideExistence: true },
    );
    if (!booking) throw new AppError("NOT_FOUND");
    if (booking.bookingType !== "quote" || booking.status !== "requested") {
      throw new AppError("CONFLICT", "This request can't be quoted anymore.");
    }

    const now = new Date();
    if (booking.startAt <= now) throw new AppError("CONFLICT", "The requested time has passed.");
    const expiresAt = quoteExpiry(now, booking.startAt, await getBookingRules(booking.shopId));

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({ quotedPriceCentavos: priceCentavos, expiresAt })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "requested")))
        .returning({ id: bookings.id });
      if (!updated) throw new AppError("CONFLICT", CHANGED_MEANWHILE);
      await changeBookingStatus(tx, {
        bookingId,
        from: "requested",
        to: "quoted",
        actorId: user.id,
        reason: note,
      });
      await writeAudit(
        {
          actorId: user.id,
          action: "booking.quoted",
          targetType: "booking",
          targetId: bookingId,
          data: { shopId: booking.shopId, priceCentavos },
        },
        tx,
      );
    });

    revalidateBooking(bookingId);
    return { expiresAt: expiresAt.toISOString() };
  });
}

/** The customer accepts the shop's quote; the booking is confirmed at that price. */
export async function acceptQuote(
  input: unknown,
): Promise<ActionResult<{ depositCentavos: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId } = parseInput(bookingIdSchema, input);
    const booking = await loadOwnBooking(db, bookingId, user.id);
    assertCan(user, "booking:accept_quote", { customerId: booking.customerId });

    const now = new Date();
    if (booking.status !== "quoted" || booking.quotedPriceCentavos === null) {
      throw new AppError("CONFLICT", "There's no open quote on this booking.");
    }
    if (booking.expiresAt && booking.expiresAt <= now) {
      throw new AppError("CONFLICT", "This quote has expired. Please send a new request.");
    }
    const rules = await getBookingRules(booking.shopId);
    const depositCentavos = paymentsEnabled()
      ? amountDueOnline(rules, booking.quotedPriceCentavos)
      : 0;

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({
          totalCentavos: booking.quotedPriceCentavos,
          depositCentavos,
          expiresAt: null,
        })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "quoted")))
        .returning({ id: bookings.id });
      if (!updated) throw new AppError("CONFLICT", CHANGED_MEANWHILE);
      await changeBookingStatus(tx, {
        bookingId,
        from: "quoted",
        to: "confirmed",
        actorId: user.id,
        reason: "Quote accepted by customer",
      });
    });

    revalidateBooking(bookingId);
    await notifyQuietly({
      userId: user.id,
      template: "booking_confirmed",
      payload: {
        bookingId,
        refCode: booking.refCode,
        shopName: booking.shopName,
        serviceName: booking.serviceName,
        startAt: booking.startAt,
        totalCentavos: booking.quotedPriceCentavos ?? undefined,
      },
    });
    return { depositCentavos };
  });
}

/** Saves the shop's booking rules: cancellation window, reschedules, quote validity and online payment. */
export async function setBookingRules(input: unknown): Promise<ActionResult<{ saved: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { shopId, ...rules } = parseInput(setBookingRulesSchema, input);
    assertCan(user, "shop:update", { shopId });
    if (rules.paymentMode !== "none" && !paymentsEnabled()) {
      throw new AppError("VALIDATION", "Online payment isn't available yet.", {
        paymentMode: ["Online payment isn't available yet."],
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(bookingPolicies)
        .values({ shopId, ...rules })
        .onConflictDoUpdate({ target: bookingPolicies.shopId, set: rules });
      await writeAudit(
        {
          actorId: user.id,
          action: "booking.rules_set",
          targetType: "shop",
          targetId: shopId,
          data: rules,
        },
        tx,
      );
    });

    revalidatePath("/dashboard/quotes");
    revalidatePath("/dashboard/booking-rules");
    return { saved: true };
  });
}

/**
 * Starts (or reopens) the online checkout for what's still due on a
 * confirmed booking and returns the payment page to send the customer to.
 * The booking is marked paid only by the provider's webhook.
 */
export async function startPayment(input: unknown): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { bookingId } = parseInput(bookingIdSchema, input);
    const booking = await loadOwnBooking(db, bookingId, user.id);
    assertCan(user, "booking:pay", { customerId: booking.customerId });
    if (!paymentsEnabled()) throw new AppError("CONFLICT", "Online payment isn't available yet.");

    const due = booking.depositCentavos - booking.paidCentavos;
    if (booking.status !== "confirmed" || due <= 0) {
      throw new AppError("CONFLICT", "There's nothing to pay on this booking right now.");
    }

    const now = new Date();
    const reusable = await findReusableCheckout(
      db,
      bookingId,
      due,
      new Date(now.getTime() - CHECKOUT_REUSE_MIN * MINUTE),
    );
    if (reusable) return { url: reusable };

    const page = `${publicEnv.NEXT_PUBLIC_SITE_URL}/account/bookings/${bookingId}`;
    const checkout = await createCheckout({
      amountCentavos: due,
      name: `${booking.serviceName} at ${booking.shopName}`,
      description: `Booking ${booking.refCode}`,
      reference: booking.refCode,
      metadata: { booking_id: bookingId },
      successUrl: `${page}?payment=done`,
      cancelUrl: `${page}?payment=cancelled`,
    });

    await db.transaction(async (tx) => {
      // Older unpaid checkouts are superseded by this one.
      await tx
        .update(payments)
        .set({ status: "expired" })
        .where(
          and(
            eq(payments.bookingId, bookingId),
            eq(payments.status, "pending"),
            ne(payments.providerSessionId, checkout.sessionId),
          ),
        );
      await tx.insert(payments).values({
        bookingId,
        customerId: user.id,
        amountCentavos: due,
        providerSessionId: checkout.sessionId,
        checkoutUrl: checkout.url,
      });
    });
    return { url: checkout.url };
  });
}
