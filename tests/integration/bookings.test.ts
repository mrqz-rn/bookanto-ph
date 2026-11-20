import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth";

// The booking module against real SQL: the slot engine's queries, the shop
// lock, change_booking_status() and its guard trigger, and the payments rows.

vi.mock("@/lib/db", () => import("./pglite-db"));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));
let currentUser: CurrentUser | null = null;
vi.mock("@/lib/auth", () => ({
  requireUser: async () => {
    if (!currentUser) throw new Error("signed out");
    return currentUser;
  },
  getCurrentUser: async () => currentUser,
}));
const notify = vi.hoisted(() => ({
  sendNotification: vi.fn().mockResolvedValue({ success: true, channel: "email" }),
}));
vi.mock("@/lib/notify", () => notify);
vi.mock("@/features/analytics/server-tracker", () => ({ trackServerEvent: vi.fn() }));
const provider = vi.hoisted(() => ({
  createCheckout: vi.fn(),
  refundPayment: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/payments", () => ({
  paymentsEnabled: () => true,
  createCheckout: provider.createCheckout,
  refundPayment: provider.refundPayment,
}));

const { db } = await import("./pglite-db");
const s = await import("@/lib/db/schema");
const customer = await import("@/features/bookings/customer-actions");
const shopSide = await import("@/features/bookings/actions");
const { recordPaidCheckout } = await import("@/features/bookings/payments");
const { expireStaleBookings } = await import("@/lib/jobs");
const { addDays } = await import("@/features/availability/slots");
const { manilaDate, manilaToUtc } = await import("@/lib/time");

const ids = {
  owner: randomUUID(),
  ana: randomUUID(),
  ben: randomUUID(),
  shop: randomUUID(),
  haircut: randomUUID(),
  aircon: randomUUID(),
  queue: randomUUID(),
  facial: randomUUID(),
};

const person = (id: string, memberships: CurrentUser["memberships"] = []): CurrentUser => ({
  id,
  authId: `auth-${id}`,
  name: "Test",
  phone: null,
  email: null,
  platformRole: "customer",
  status: "active",
  memberships,
});
const owner = () => person(ids.owner, [{ shopId: ids.shop, role: "owner" }]);
const ana = () => person(ids.ana);
const ben = () => person(ids.ben);
const as = (user: CurrentUser) => {
  currentUser = user;
};

const tomorrow = addDays(manilaDate(new Date()), 1);
const at = (time: string, date = tomorrow) => manilaToUtc(date, time).toISOString();
const key = () => randomUUID().replaceAll("-", "");

async function bookingRow(id: string) {
  const [row] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
  return row!;
}
async function events(id: string) {
  return db
    .select({ from: s.bookingEvents.fromStatus, to: s.bookingEvents.toStatus })
    .from(s.bookingEvents)
    .where(eq(s.bookingEvents.bookingId, id))
    .orderBy(s.bookingEvents.createdAt);
}
function expectOk<T>(result: { ok: true; data: T } | { ok: false; code: string; message: string }) {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
}

beforeAll(async () => {
  await db.insert(s.users).values([
    { id: ids.owner, authId: "owner", phone: "+639170000001", name: "Olive Owner" },
    { id: ids.ana, authId: "ana", phone: "+639170000002", name: "Ana Santos" },
    { id: ids.ben, authId: "ben", phone: "+639170000003", name: "Ben Cruz" },
  ]);
  await db.insert(s.shops).values({
    id: ids.shop,
    ownerId: ids.owner,
    slug: "kanto-cuts",
    name: "Kanto Cuts",
    status: "active",
  });
  await db.insert(s.shopMembers).values({ shopId: ids.shop, userId: ids.owner, role: "owner" });
  await db.insert(s.services).values([
    { id: ids.haircut, shopId: ids.shop, name: "Haircut", priceCentavos: 15_000, durationMin: 60 },
    {
      id: ids.aircon,
      shopId: ids.shop,
      name: "Aircon check",
      priceType: "quote",
      priceCentavos: null,
      durationMin: 60,
      bookingType: "quote",
    },
    {
      id: ids.queue,
      shopId: ids.shop,
      name: "Walk-in trim",
      priceCentavos: 8_000,
      durationMin: 20,
      bookingType: "queue",
    },
    { id: ids.facial, shopId: ids.shop, name: "Facial", priceCentavos: 50_000, durationMin: 60 },
  ]);
  // Open all day, every day, so the tests don't depend on the clock.
  await db.insert(s.businessHours).values(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      shopId: ids.shop,
      weekday,
      opens: "00:00",
      closes: "23:59",
    })),
  );
});

describe("slot bookings", () => {
  let first: string;

  it("books an open time as a request, once per tap", async () => {
    as(ana());
    const idempotencyKey = key();
    const input = { serviceId: ids.haircut, startAt: at("10:00"), idempotencyKey };
    notify.sendNotification.mockClear();
    first = expectOk(await customer.createBooking(input)).bookingId;
    const again = expectOk(await customer.createBooking(input));

    expect(again.bookingId).toBe(first);
    // The shop owner is emailed about the new request once, not on the repeat tap.
    const toShop = notify.sendNotification.mock.calls.filter(
      ([options]) => options.template === "booking_request_received",
    );
    expect(toShop).toHaveLength(1);
    expect(toShop[0]![0]).toMatchObject({
      userId: ids.owner,
      payload: { bookingId: first, customerName: "Test", startAt: new Date(at("10:00")) },
    });
    expect(toShop[0]![0].payload.expiresAt).toBeInstanceOf(Date);
    const row = await bookingRow(first);
    expect(row).toMatchObject({
      status: "requested",
      bookingType: "slot",
      totalCentavos: 15_000,
      endAt: new Date(at("11:00")),
    });
    expect(row.expiresAt).not.toBeNull();
    expect(await events(first)).toEqual([{ from: null, to: "requested" }]);
  });

  it("won't give the same time to someone else", async () => {
    as(ben());
    const result = await customer.createBooking({
      serviceId: ids.haircut,
      startAt: at("10:00"),
      idempotencyKey: key(),
    });
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });

  it("lets the shop accept, through change_booking_status()", async () => {
    as(owner());
    expectOk(await shopSide.acceptBooking({ bookingId: first }));
    expect((await bookingRow(first)).status).toBe("confirmed");
    expect(await events(first)).toEqual([
      { from: null, to: "requested" },
      { from: "requested", to: "confirmed" },
    ]);
  });

  it("rejects a status change made any other way", async () => {
    await expect(
      db.update(s.bookings).set({ status: "completed" }).where(eq(s.bookings.id, first)),
    ).rejects.toThrow();
    // A move the lifecycle doesn't allow fails in the database too.
    await expect(
      db.execute(
        sql`select public.change_booking_status(${first}::uuid, 'confirmed', 'requested', null, null)`,
      ),
    ).rejects.toThrow();
  });

  it("won't complete or mark a no-show before the booking starts", async () => {
    as(owner());
    expect(await shopSide.completeBooking({ bookingId: first })).toMatchObject({
      ok: false,
      code: "CONFLICT",
    });
    expect(await shopSide.markNoShow({ bookingId: first })).toMatchObject({
      ok: false,
      code: "CONFLICT",
    });
  });

  it("moves to another open time and frees the old one", async () => {
    as(ana());
    const slotsResult = expectOk(await customer.getRescheduleSlots({ bookingId: first }));
    expect(slotsResult.days.length).toBe(14);

    expectOk(await customer.rescheduleBooking({ bookingId: first, startAt: at("13:00") }));
    const row = await bookingRow(first);
    expect(row).toMatchObject({ status: "confirmed", rescheduleCount: 1 });
    expect(row.startAt.toISOString()).toBe(at("13:00"));

    as(ben());
    expectOk(
      await customer.createBooking({
        serviceId: ids.haircut,
        startAt: at("10:00"),
        idempotencyKey: key(),
      }),
    );
  });

  it("hides other customers' bookings", async () => {
    as(ben());
    expect(await customer.cancelMyBooking({ bookingId: first })).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("counts a cancellation inside the shop's window as late", async () => {
    await db.insert(s.bookingPolicies).values({ shopId: ids.shop, cancelWindowHours: 168 });
    as(ana());
    expect(expectOk(await customer.cancelMyBooking({ bookingId: first }))).toMatchObject({
      late: true,
    });
    expect(await bookingRow(first)).toMatchObject({ status: "cancelled", lateCancel: true });
    await db
      .update(s.bookingPolicies)
      .set({ cancelWindowHours: 2 })
      .where(eq(s.bookingPolicies.shopId, ids.shop));
  });
});

describe("quotes", () => {
  it("goes requested → quoted → confirmed at the quoted price", async () => {
    as(ana());
    expect(
      await customer.createBooking({
        serviceId: ids.aircon,
        startAt: at("15:00"),
        idempotencyKey: key(),
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    const { bookingId } = expectOk(
      await customer.createBooking({
        serviceId: ids.aircon,
        startAt: at("15:00"),
        notes: "Two split-type units",
        idempotencyKey: key(),
      }),
    );
    expect((await bookingRow(bookingId)).totalCentavos).toBeNull();

    as(owner());
    expect(await shopSide.acceptBooking({ bookingId })).toMatchObject({ ok: false });
    expectOk(await customer.sendQuote({ bookingId, priceCentavos: 180_000, note: "Both units" }));

    as(ana());
    expectOk(await customer.acceptQuote({ bookingId }));
    expect(await bookingRow(bookingId)).toMatchObject({
      status: "confirmed",
      totalCentavos: 180_000,
      quotedPriceCentavos: 180_000,
    });
    expect((await events(bookingId)).map((event) => event.to)).toEqual([
      "requested",
      "quoted",
      "confirmed",
    ]);
  });
});

describe("queue", () => {
  it("gives numbers in order, one each", async () => {
    as(ana());
    const a = expectOk(await customer.joinQueue({ serviceId: ids.queue, idempotencyKey: key() }));
    as(ben());
    const b = expectOk(await customer.joinQueue({ serviceId: ids.queue, idempotencyKey: key() }));
    expect([a.queueNumber, b.queueNumber]).toEqual([1, 2]);
    expect(b.ahead).toBe(1);

    as(ana());
    expect(await customer.joinQueue({ serviceId: ids.queue, idempotencyKey: key() })).toMatchObject(
      { ok: false, code: "CONFLICT" },
    );

    // Walk-ins the shop adds join the same queue.
    as(owner());
    expectOk(
      await shopSide.addWalkIn({
        shopId: ids.shop,
        serviceId: ids.queue,
        customerName: "Mang Tony",
        startAt: new Date().toISOString(),
      }),
    );
    const numbers = await db
      .select({ n: s.bookings.queueNumber })
      .from(s.bookings)
      .where(and(eq(s.bookings.serviceId, ids.queue)))
      .orderBy(s.bookings.queueNumber);
    expect(numbers.map((row) => row.n)).toEqual([1, 2, 3]);
  });
});

describe("deposits", () => {
  let bookingId: string;

  it("asks for the deposit once the shop confirms, and records the webhook once", async () => {
    await db
      .update(s.bookingPolicies)
      .set({ paymentMode: "deposit", depositType: "percent", depositValue: 20 })
      .where(eq(s.bookingPolicies.shopId, ids.shop));

    as(ben());
    bookingId = expectOk(
      await customer.createBooking({
        serviceId: ids.facial,
        startAt: at("16:00"),
        idempotencyKey: key(),
      }),
    ).bookingId;
    expect((await bookingRow(bookingId)).depositCentavos).toBe(10_000);
    // Nothing to pay until the shop confirms.
    expect(await customer.startPayment({ bookingId })).toMatchObject({ ok: false });

    as(owner());
    expectOk(await shopSide.acceptBooking({ bookingId }));

    provider.createCheckout.mockResolvedValueOnce({
      sessionId: "cs_test_1",
      url: "https://checkout.example/cs_test_1",
    });
    as(ben());
    expect(expectOk(await customer.startPayment({ bookingId })).url).toBe(
      "https://checkout.example/cs_test_1",
    );
    expect(provider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amountCentavos: 10_000 }),
    );
    // Going back to pay reopens the same checkout.
    expect(expectOk(await customer.startPayment({ bookingId })).url).toBe(
      "https://checkout.example/cs_test_1",
    );
    expect(provider.createCheckout).toHaveBeenCalledTimes(1);

    const event = { sessionId: "cs_test_1", providerPaymentId: "pay_1" };
    expect(await recordPaidCheckout(event)).toBe(bookingId);
    expect(await recordPaidCheckout(event)).toBe(bookingId);
    expect((await bookingRow(bookingId)).paidCentavos).toBe(10_000);
    expect(await recordPaidCheckout({ sessionId: "cs_unknown", providerPaymentId: null })).toBe(
      null,
    );
  });

  it("refunds the deposit when the shop cancels", async () => {
    as(owner());
    expectOk(await shopSide.cancelBooking({ bookingId, reason: "Aircon broke down" }));
    expect(provider.refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({ providerPaymentId: "pay_1", amountCentavos: 10_000 }),
    );
    const [payment] = await db
      .select({ status: s.payments.status })
      .from(s.payments)
      .where(eq(s.payments.bookingId, bookingId));
    expect(payment?.status).toBe("refunded");
    expect((await bookingRow(bookingId)).paidCentavos).toBe(0);
  });
});

describe("expiry job", () => {
  it("expires unanswered requests through change_booking_status()", async () => {
    as(ana());
    const { bookingId } = expectOk(
      await customer.createBooking({
        serviceId: ids.haircut,
        startAt: at("18:00"),
        idempotencyKey: key(),
      }),
    );
    await db
      .update(s.bookings)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(s.bookings.id, bookingId));

    const result = await expireStaleBookings();
    expect(result.bookingIds).toContain(bookingId);
    expect((await bookingRow(bookingId)).status).toBe("expired");
    expect((await events(bookingId)).at(-1)).toEqual({ from: "requested", to: "expired" });
  });
});
