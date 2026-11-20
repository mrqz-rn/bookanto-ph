import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";

import { db, type DbExecutor } from "@/lib/db";
import {
  bookingEvents,
  bookingPolicies,
  bookings,
  payments,
  services,
  shopMembers,
  shops,
  staffSchedules,
  users,
  type BookingStatus,
  type BookingType,
  type PriceType,
  type ShopStatus,
} from "@/lib/db/schema";
import { manilaDate, manilaToUtc } from "@/lib/time";

import { DEFAULT_RULES, FINAL_STATUSES, type BookingRules } from "./rules";

// Reads for the customer side of booking. Never cached: they're per user.

export const MY_BOOKINGS_PAGE_SIZE = 20;
const ACTIVE_STATUSES: BookingStatus[] = ["requested", "quoted", "confirmed"];

/** The shop's booking rules, or the defaults when it hasn't set any. */
export async function getBookingRules(
  shopId: string,
  executor: DbExecutor = db,
): Promise<BookingRules> {
  const [row] = await executor
    .select({
      cancelWindowHours: bookingPolicies.cancelWindowHours,
      maxReschedules: bookingPolicies.maxReschedules,
      quoteValidHours: bookingPolicies.quoteValidHours,
      paymentMode: bookingPolicies.paymentMode,
      depositType: bookingPolicies.depositType,
      depositValue: bookingPolicies.depositValue,
    })
    .from(bookingPolicies)
    .where(eq(bookingPolicies.shopId, shopId))
    .limit(1);
  return row ?? DEFAULT_RULES;
}

/** The UTC range of the Manila day containing `now`. */
export function manilaDayRange(now: Date): { start: Date; end: Date } {
  const start = manilaToUtc(manilaDate(now));
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

/** People still ahead in today's queue for a service (requested or confirmed). */
export async function countWaiting(
  serviceId: string,
  now: Date,
  beforeNumber?: number,
  executor: DbExecutor = db,
): Promise<number> {
  const day = manilaDayRange(now);
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.serviceId, serviceId),
        eq(bookings.bookingType, "queue"),
        inArray(bookings.status, ["requested", "confirmed"]),
        gte(bookings.startAt, day.start),
        lt(bookings.startAt, day.end),
        beforeNumber === undefined ? undefined : lt(bookings.queueNumber, beforeNumber),
      ),
    );
  return row?.count ?? 0;
}

export type BookableService = {
  id: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCentavos: number | null;
  durationMin: number;
  bookingType: BookingType;
  active: boolean;
  shop: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    status: ShopStatus;
    /** An admin checked the shop's documents. */
    verified: boolean;
  };
  /** Staff the customer can ask for; empty when the shop doesn't schedule by staff. */
  staff: Array<{ userId: string; name: string }>;
  rules: BookingRules;
  /** Queue services: how many people are waiting now. */
  waiting: number;
};

/** What the booking page needs about a service. Null when it doesn't exist. */
export async function getBookableService(
  serviceId: string,
  now: Date,
): Promise<BookableService | null> {
  const [row] = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      priceType: services.priceType,
      priceCentavos: services.priceCentavos,
      durationMin: services.durationMin,
      bookingType: services.bookingType,
      active: services.active,
      shopId: shops.id,
      shopName: shops.name,
      shopSlug: shops.slug,
      shopAddress: shops.address,
      shopStatus: shops.status,
      shopVerifiedAt: shops.verifiedAt,
    })
    .from(services)
    .innerJoin(shops, eq(shops.id, services.shopId))
    .where(eq(services.id, serviceId))
    .limit(1);
  if (!row) return null;

  const [staff, rules, waiting] = await Promise.all([
    db
      .select({ userId: staffSchedules.userId, name: users.name })
      .from(staffSchedules)
      .innerJoin(
        shopMembers,
        and(
          eq(shopMembers.shopId, staffSchedules.shopId),
          eq(shopMembers.userId, staffSchedules.userId),
        ),
      )
      .innerJoin(users, eq(users.id, staffSchedules.userId))
      .where(and(eq(staffSchedules.shopId, row.shopId), eq(shopMembers.active, true)))
      .orderBy(asc(users.name)),
    getBookingRules(row.shopId),
    row.bookingType === "queue" ? countWaiting(row.id, now) : 0,
  ]);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceType: row.priceType,
    priceCentavos: row.priceCentavos,
    durationMin: row.durationMin,
    bookingType: row.bookingType,
    active: row.active,
    shop: {
      id: row.shopId,
      name: row.shopName,
      slug: row.shopSlug,
      address: row.shopAddress,
      status: row.shopStatus,
      verified: row.shopVerifiedAt !== null,
    },
    // First names only: these are shown to anyone browsing.
    staff: staff.map((member) => ({
      userId: member.userId,
      name: member.name?.trim().split(/\s+/)[0] || "Staff",
    })),
    rules,
    waiting,
  };
}

export type MyBooking = {
  id: string;
  refCode: string;
  status: BookingStatus;
  bookingType: BookingType;
  startAt: string;
  endAt: string | null;
  expiresAt: string | null;
  serviceId: string;
  serviceName: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopAddress: string | null;
  staffName: string | null;
  address: string | null;
  notes: string | null;
  priceType: PriceType;
  totalCentavos: number | null;
  quotedPriceCentavos: number | null;
  depositCentavos: number;
  paidCentavos: number;
  queueNumber: number | null;
  rescheduleCount: number;
  lateCancel: boolean;
};

const staffUsers = sql`staff_user`;

function selectMyBookings(executor: DbExecutor) {
  return executor
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      status: bookings.status,
      bookingType: bookings.bookingType,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      expiresAt: bookings.expiresAt,
      serviceId: bookings.serviceId,
      serviceName: services.name,
      shopId: bookings.shopId,
      shopName: shops.name,
      shopSlug: shops.slug,
      shopAddress: shops.address,
      staffName: sql<
        string | null
      >`(select ${staffUsers}.name from ${users} as ${staffUsers} where ${staffUsers}.id = ${bookings.staffId})`,
      address: bookings.address,
      notes: bookings.notes,
      priceType: services.priceType,
      totalCentavos: bookings.totalCentavos,
      quotedPriceCentavos: bookings.quotedPriceCentavos,
      depositCentavos: bookings.depositCentavos,
      paidCentavos: bookings.paidCentavos,
      queueNumber: bookings.queueNumber,
      rescheduleCount: bookings.rescheduleCount,
      lateCancel: bookings.lateCancel,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(shops, eq(shops.id, bookings.shopId))
    .$dynamic();
}

type MyBookingRow = Awaited<ReturnType<typeof selectMyBookings>>[number];

const toMyBooking = (row: MyBookingRow): MyBooking => ({
  ...row,
  shopSlug: (row as unknown as { shopSlug: string }).shopSlug,
  staffName: row.staffName?.trim().split(/\s+/)[0] ?? null,
  startAt: row.startAt.toISOString(),
  endAt: row.endAt?.toISOString() ?? null,
  expiresAt: row.expiresAt?.toISOString() ?? null,
});

export type MyBookingsPage = { items: MyBooking[]; nextCursor: string | null };

/**
 * The customer's bookings. "upcoming" is everything still open, soonest
 * first. "past" is everything closed, newest first, 20 at a time with a
 * cursor of the last item's start time and id.
 */
export async function getMyBookings(
  customerId: string,
  scope: "upcoming" | "past",
  cursor?: string | null,
): Promise<MyBookingsPage> {
  if (scope === "upcoming") {
    const rows = await selectMyBookings(db)
      .where(and(eq(bookings.customerId, customerId), inArray(bookings.status, ACTIVE_STATUSES)))
      .orderBy(asc(bookings.startAt), asc(bookings.id))
      .limit(100);
    return { items: rows.map(toMyBooking), nextCursor: null };
  }

  const [cursorTime, cursorId] = cursor?.split("_") ?? [];
  const cursorDate = cursorTime ? new Date(Number(cursorTime)) : null;
  const validCursor =
    cursorDate && !Number.isNaN(cursorDate.getTime()) && /^[0-9a-f-]{36}$/.test(cursorId ?? "");
  const rows = await selectMyBookings(db)
    .where(
      and(
        eq(bookings.customerId, customerId),
        inArray(bookings.status, [...FINAL_STATUSES]),
        validCursor
          ? or(
              lt(bookings.startAt, cursorDate),
              and(eq(bookings.startAt, cursorDate), lt(bookings.id, cursorId!)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(bookings.startAt), desc(bookings.id))
    .limit(MY_BOOKINGS_PAGE_SIZE + 1);

  const items = rows.slice(0, MY_BOOKINGS_PAGE_SIZE).map(toMyBooking);
  const last = rows.length > MY_BOOKINGS_PAGE_SIZE ? rows[MY_BOOKINGS_PAGE_SIZE - 1] : null;
  return {
    items,
    nextCursor: last ? `${last.startAt.getTime()}_${last.id}` : null,
  };
}

export type MyBookingEvent = {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  reason: string | null;
  /** Who did it, from the customer's point of view. */
  by: "you" | "shop" | "system";
  createdAt: string;
};

export type MyBookingDetail = MyBooking & {
  events: MyBookingEvent[];
  rules: BookingRules;
  /** Queue bookings still waiting: people ahead in line. */
  ahead: number | null;
};

/** One of the customer's own bookings with its history, or null. */
export async function getMyBooking(
  customerId: string,
  bookingId: string,
): Promise<MyBookingDetail | null> {
  const [row] = await selectMyBookings(db)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId)))
    .limit(1);
  if (!row) return null;

  const waitingInQueue =
    row.bookingType === "queue" &&
    row.queueNumber !== null &&
    (row.status === "requested" || row.status === "confirmed");
  const [events, rules, ahead] = await Promise.all([
    db
      .select({
        id: bookingEvents.id,
        fromStatus: bookingEvents.fromStatus,
        toStatus: bookingEvents.toStatus,
        reason: bookingEvents.reason,
        actorId: bookingEvents.actorId,
        createdAt: bookingEvents.createdAt,
      })
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, bookingId))
      .orderBy(asc(bookingEvents.createdAt)),
    getBookingRules(row.shopId),
    waitingInQueue ? countWaiting(row.serviceId, row.startAt, row.queueNumber!) : null,
  ]);

  return {
    ...toMyBooking(row),
    events: events.map(({ actorId, createdAt, ...event }) => ({
      ...event,
      by: actorId === null ? "system" : actorId === customerId ? "you" : "shop",
      createdAt: createdAt.toISOString(),
    })),
    rules,
    ahead,
  };
}

export type QuoteRequest = {
  id: string;
  refCode: string;
  status: "requested" | "quoted";
  serviceName: string;
  customerName: string;
  startAt: string;
  expiresAt: string | null;
  notes: string | null;
  quotedPriceCentavos: number | null;
  staffId: string | null;
};

/**
 * Quote requests waiting on the shop or the customer. First name and the
 * job description only: phone and address stay hidden until it's confirmed.
 */
export async function getQuoteRequests(shopId: string): Promise<QuoteRequest[]> {
  const rows = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      status: bookings.status,
      serviceName: services.name,
      customerName: users.name,
      startAt: bookings.startAt,
      expiresAt: bookings.expiresAt,
      notes: bookings.notes,
      quotedPriceCentavos: bookings.quotedPriceCentavos,
      staffId: bookings.staffId,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(users, eq(users.id, bookings.customerId))
    .where(
      and(
        eq(bookings.shopId, shopId),
        eq(bookings.bookingType, "quote"),
        inArray(bookings.status, ["requested", "quoted"]),
      ),
    )
    .orderBy(asc(bookings.startAt))
    .limit(100);

  return rows.map((row) => ({
    ...row,
    status: row.status as "requested" | "quoted",
    customerName: row.customerName?.trim().split(/\s+/)[0] || "Customer",
    startAt: row.startAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  }));
}

/** A pending checkout the customer can go back to, if one was started recently. */
export async function findReusableCheckout(
  executor: DbExecutor,
  bookingId: string,
  amountCentavos: number,
  since: Date,
): Promise<string | null> {
  const [row] = await executor
    .select({ checkoutUrl: payments.checkoutUrl })
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, bookingId),
        eq(payments.status, "pending"),
        eq(payments.amountCentavos, amountCentavos),
        gte(payments.createdAt, since),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return row?.checkoutUrl ?? null;
}

export type QueueEntry = {
  id: string;
  refCode: string;
  queueNumber: number;
  status: BookingStatus;
  serviceName: string;
  /** First name, or the walk-in label the shop typed. */
  name: string;
  joinedAt: string;
  isWalkIn: boolean;
};

/** Today's queue for a shop, in number order: still waiting first, then served. */
export async function getTodaysQueue(shopId: string, now: Date): Promise<QueueEntry[]> {
  const day = manilaDayRange(now);
  const rows = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      queueNumber: bookings.queueNumber,
      status: bookings.status,
      serviceName: services.name,
      customerName: users.name,
      notes: bookings.notes,
      customerId: bookings.customerId,
      startAt: bookings.startAt,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(users, eq(users.id, bookings.customerId))
    .where(
      and(
        eq(bookings.shopId, shopId),
        eq(bookings.bookingType, "queue"),
        gte(bookings.startAt, day.start),
        lt(bookings.startAt, day.end),
      ),
    )
    .orderBy(asc(bookings.queueNumber));

  return rows
    .filter((row) => row.queueNumber !== null)
    .map((row) => ({
      id: row.id,
      refCode: row.refCode,
      queueNumber: row.queueNumber!,
      status: row.status,
      serviceName: row.serviceName,
      name: row.customerId
        ? row.customerName?.trim().split(/\s+/)[0] || "Customer"
        : (row.notes?.match(/^Walk-in: ([^·]+)/)?.[1]?.trim() ?? "Walk-in"),
      joinedAt: row.startAt.toISOString(),
      isWalkIn: !row.customerId,
    }));
}
