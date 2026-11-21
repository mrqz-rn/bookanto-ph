import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addClosure,
  addTimeOff,
  getOpenSlots,
  removeClosure,
  setHolidayRules,
  setHours,
  setStaffSchedule,
} from "@/features/availability/actions";
import {
  computeOpenSlots,
  countHeldBookings,
  getSlotService,
} from "@/features/availability/queries";
import { writeAudit } from "@/lib/audit";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";
import { closures, shopHolidayRules, staffHours, staffSchedules } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn(),
}));
vi.mock("@/features/availability/queries", () => ({
  countHeldBookings: vi.fn().mockResolvedValue(0),
  getSlotService: vi.fn(),
  computeOpenSlots: vi.fn().mockResolvedValue([]),
}));

const SHOP = randomUUID();
const STAFF_ID = randomUUID();

const actor = (role?: "owner" | "manager" | "staff"): authModule.CurrentUser => ({
  id: role === "staff" ? STAFF_ID : randomUUID(),
  authId: "auth",
  name: "Test",
  phone: null,
  email: null,
  platformRole: "customer",
  status: "active",
  memberships: role ? [{ shopId: SHOP, role }] : [],
});

type Call = { op: string; table: unknown; method: string; args: unknown[] };

/**
 * A stand-in for a Drizzle transaction. Every builder chain resolves to the
 * result given for its operation and records each call for assertions.
 */
function fakeTx(results: { select?: unknown[]; insert?: unknown[]; delete?: unknown[] } = {}) {
  const calls: Call[] = [];
  const chain = (op: string, table: unknown, result: unknown): unknown => {
    const proxy: unknown = new Proxy(
      {},
      {
        get(_, method: string) {
          if (method === "then") {
            return (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
              Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            calls.push({ op, table, method, args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const tx = {
    select: vi.fn(() => chain("select", undefined, results.select ?? [{ id: "member" }])),
    insert: vi.fn((table: unknown) => chain("insert", table, results.insert ?? [{ id: "new" }])),
    delete: vi.fn((table: unknown) => chain("delete", table, results.delete ?? [{ id: "gone" }])),
  };
  vi.spyOn(db, "transaction").mockImplementation((async (
    callback: (t: unknown) => Promise<unknown>,
  ) => callback(tx)) as never);
  return { tx, calls };
}

const valuesFor = (calls: Call[], table: unknown) =>
  calls.find((call) => call.op === "insert" && call.table === table && call.method === "values")
    ?.args[0];

const signIn = (user: authModule.CurrentUser | null) => {
  vi.spyOn(authModule, "requireUser").mockImplementation(async () => {
    if (!user) throw new AppError("UNAUTHENTICATED");
    return user;
  });
  vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(user);
};

const monday = {
  weekday: 1,
  opens: "09:00",
  closes: "18:00",
  breakStart: "12:00",
  breakEnd: "13:00",
};

beforeEach(() => {
  // 10:00 Manila on Tuesday, Dec 1, 2026.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-01T02:00:00Z"));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(writeAudit).mockClear();
  vi.mocked(revalidateTag).mockClear();
});

describe("setHours", () => {
  it("needs a signed-in user", async () => {
    signIn(null);
    expect(await setHours({ shopId: SHOP, hours: [] })).toMatchObject({
      ok: false,
      code: "UNAUTHENTICATED",
    });
  });

  it("rejects a break outside opening hours", async () => {
    signIn(actor("owner"));
    const result = await setHours({
      shopId: SHOP,
      hours: [{ ...monday, breakStart: "08:00", breakEnd: "09:30" }],
    });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("is for owners and managers, not staff", async () => {
    signIn(actor("staff"));
    expect(await setHours({ shopId: SHOP, hours: [monday] })).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("replaces the week, audits, and refreshes the shop's caches", async () => {
    signIn(actor("manager"));
    const { tx, calls } = fakeTx();
    const result = await setHours({
      shopId: SHOP,
      hours: [monday, { ...monday, weekday: 2, breakStart: null, breakEnd: null }],
    });

    expect(result).toEqual({ ok: true, data: { openDays: 2 } });
    expect(tx.delete).toHaveBeenCalledTimes(1);
    expect(calls.find((call) => call.method === "values")?.args[0]).toEqual([
      { shopId: SHOP, ...monday },
      { shopId: SHOP, ...monday, weekday: 2, breakStart: null, breakEnd: null },
    ]);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "availability.hours_set", targetId: SHOP }),
      tx,
    );
    expect(revalidateTag).toHaveBeenCalledWith(`availability:${SHOP}`);
    expect(revalidateTag).toHaveBeenCalledWith("shops");
  });

  it("closes every day when given no hours", async () => {
    signIn(actor("owner"));
    const { tx } = fakeTx();
    expect(await setHours({ shopId: SHOP, hours: [] })).toEqual({
      ok: true,
      data: { openDays: 0 },
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });
});

describe("addClosure", () => {
  const range = {
    shopId: SHOP,
    startDate: "2026-12-24",
    endDate: "2026-12-26",
    allDay: true,
    reason: "Christmas break",
  };

  it("stores whole Manila days as UTC instants and reports held bookings", async () => {
    signIn(actor("owner"));
    vi.mocked(countHeldBookings).mockResolvedValueOnce(2);
    const { calls } = fakeTx();

    expect(await addClosure(range)).toEqual({ ok: true, data: { id: "new", heldBookings: 2 } });
    expect(valuesFor(calls, closures)).toEqual({
      shopId: SHOP,
      startsAt: new Date("2026-12-23T16:00:00Z"),
      endsAt: new Date("2026-12-26T16:00:00Z"),
      reason: "Christmas break",
    });
  });

  it("stores a time range on one day", async () => {
    signIn(actor("owner"));
    const { calls } = fakeTx();
    await addClosure({
      ...range,
      endDate: "2026-12-24",
      allDay: false,
      startTime: "15:00",
      endTime: "19:00",
      reason: "",
    });
    expect(valuesFor(calls, closures)).toMatchObject({
      startsAt: new Date("2026-12-24T07:00:00Z"),
      endsAt: new Date("2026-12-24T11:00:00Z"),
      reason: null,
    });
  });

  it("refuses a closure that has already ended", async () => {
    signIn(actor("owner"));
    const result = await addClosure({ ...range, startDate: "2026-11-30", endDate: "2026-11-30" });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("is not for staff", async () => {
    signIn(actor("staff"));
    expect(await addClosure(range)).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});

describe("removeClosure", () => {
  it("only removes the shop's own closure", async () => {
    signIn(actor("owner"));
    fakeTx({ delete: [] });
    const result = await removeClosure({ shopId: SHOP, closureId: randomUUID() });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

describe("addTimeOff", () => {
  const timeOff = {
    shopId: SHOP,
    userId: STAFF_ID,
    startDate: "2026-12-05",
    endDate: "2026-12-05",
    allDay: true,
  };

  it("lets staff block time", async () => {
    signIn(actor("staff"));
    fakeTx();
    expect(await addTimeOff(timeOff)).toEqual({ ok: true, data: { id: "new", heldBookings: 0 } });
    expect(countHeldBookings).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ shopId: SHOP, staffId: STAFF_ID }),
    );
  });

  it("only for members of the shop", async () => {
    signIn(actor("owner"));
    const { tx } = fakeTx({ select: [] });
    expect(await addTimeOff(timeOff)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("is not for customers", async () => {
    signIn(actor());
    expect(await addTimeOff(timeOff)).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});

describe("setHolidayRules", () => {
  it("rejects unknown holidays", async () => {
    signIn(actor("owner"));
    const result = await setHolidayRules({
      shopId: SHOP,
      rules: [{ holidayKey: "my_birthday", opens: null, closes: null }],
    });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("saves closed days and special hours", async () => {
    signIn(actor("owner"));
    const { calls } = fakeTx();
    const result = await setHolidayRules({
      shopId: SHOP,
      rules: [
        { holidayKey: "christmas_day", opens: null, closes: null },
        { holidayKey: "christmas_eve", opens: "10:00", closes: "15:00" },
      ],
    });
    expect(result).toEqual({ ok: true, data: { closedOn: 1, specialHours: 1 } });
    expect(valuesFor(calls, shopHolidayRules)).toEqual([
      { shopId: SHOP, holidayKey: "christmas_day", opens: null, closes: null },
      { shopId: SHOP, holidayKey: "christmas_eve", opens: "10:00", closes: "15:00" },
    ]);
  });
});

describe("setStaffSchedule", () => {
  const schedule = {
    shopId: SHOP,
    userId: STAFF_ID,
    takesBookings: true,
    usesShopHours: false,
    hours: [monday],
  };

  it("is for owners and managers", async () => {
    signIn(actor("staff"));
    expect(await setStaffSchedule(schedule)).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("needs a working day for own hours", async () => {
    signIn(actor("owner"));
    expect(await setStaffSchedule({ ...schedule, hours: [] })).toMatchObject({
      ok: false,
      code: "VALIDATION",
    });
  });

  it("saves own hours", async () => {
    signIn(actor("owner"));
    const { calls } = fakeTx();
    expect(await setStaffSchedule(schedule)).toEqual({ ok: true, data: { takesBookings: true } });
    expect(valuesFor(calls, staffSchedules)).toEqual({
      shopId: SHOP,
      userId: STAFF_ID,
      usesShopHours: false,
    });
    expect(valuesFor(calls, staffHours)).toEqual([{ shopId: SHOP, userId: STAFF_ID, ...monday }]);
  });

  it("removes the schedule when the member stops taking bookings", async () => {
    signIn(actor("owner"));
    const { tx } = fakeTx();
    await setStaffSchedule({ ...schedule, takesBookings: false, hours: [] });
    expect(tx.delete).toHaveBeenCalledWith(staffSchedules);
    expect(tx.insert).not.toHaveBeenCalled();
  });
});

describe("getOpenSlots", () => {
  const service = {
    id: randomUUID(),
    shopId: SHOP,
    name: "Haircut",
    durationMin: 30,
    bufferMin: 0,
    capacity: 1,
    bookingType: "slot" as const,
    active: true,
    shopStatus: "active" as const,
  };

  it("lets guests browse an active shop's slots", async () => {
    signIn(null);
    vi.mocked(getSlotService).mockResolvedValueOnce(service);
    const result = await getOpenSlots({ serviceId: service.id, date: "2026-12-01", days: 7 });
    expect(result).toEqual({ ok: true, data: { days: [] } });
    expect(computeOpenSlots).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: "2026-12-01", days: 7, service }),
    );
  });

  it("stops at the booking horizon", async () => {
    signIn(null);
    vi.mocked(getSlotService).mockResolvedValueOnce(service);
    await getOpenSlots({ serviceId: service.id, date: "2027-01-28", days: 14 });
    expect(computeOpenSlots).toHaveBeenLastCalledWith(expect.objectContaining({ days: 3 }));
  });

  it("hides a draft shop's slots from everyone but its members", async () => {
    const draft = { ...service, shopStatus: "draft" as const };
    signIn(null);
    vi.mocked(getSlotService).mockResolvedValueOnce(draft);
    expect(await getOpenSlots({ serviceId: service.id, date: "2026-12-01" })).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });

    signIn(actor("staff"));
    vi.mocked(getSlotService).mockResolvedValueOnce(draft);
    expect(await getOpenSlots({ serviceId: service.id, date: "2026-12-01" })).toMatchObject({
      ok: true,
    });
  });

  it("has no slots for queue services", async () => {
    signIn(null);
    vi.mocked(getSlotService).mockResolvedValueOnce({ ...service, bookingType: "queue" });
    expect(await getOpenSlots({ serviceId: service.id, date: "2026-12-01" })).toMatchObject({
      ok: false,
      code: "VALIDATION",
    });
  });

  it("rejects past dates and unknown fields", async () => {
    signIn(null);
    vi.mocked(getSlotService).mockResolvedValue(service);
    expect(await getOpenSlots({ serviceId: service.id, date: "2026-11-30" })).toMatchObject({
      ok: false,
      code: "VALIDATION",
    });
    expect(
      await getOpenSlots({ serviceId: service.id, date: "2026-12-01", shopId: SHOP }),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
  });
});
