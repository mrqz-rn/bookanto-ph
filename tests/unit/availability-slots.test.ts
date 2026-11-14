import { describe, expect, it } from "vitest";

import type { DayHours } from "@/features/availability/constants";
import {
  addDays,
  findOpenSlot,
  openSlotsOnDate,
  type BusyBooking,
  type ShopSchedule,
  type SlotService,
  type StaffSchedule,
} from "@/features/availability/slots";

// Vitest runs in America/Los_Angeles (vitest.config.mts), so any local-time
// math in the engine shows up here as wrong slot times.

const MONDAY = "2026-12-07";
const SUNDAY = "2026-12-06";
const LONG_AGO = new Date("2026-12-01T00:00:00Z");

const day = (weekday: number, opens: string, closes: string, brk?: [string, string]): DayHours => ({
  weekday,
  opens,
  closes,
  breakStart: brk?.[0] ?? null,
  breakEnd: brk?.[1] ?? null,
});

const schedule = (overrides: Partial<ShopSchedule> = {}): ShopSchedule => ({
  hours: [1, 2, 3, 4, 5, 6].map((weekday) => day(weekday, "09:00", "12:00")),
  closures: [],
  holidayRules: [],
  staff: [],
  ...overrides,
});

const haircut: SlotService = { id: "haircut", durationMin: 60, bufferMin: 0, capacity: 1 };

/** Manila wall-clock time on a date as a UTC ISO string (Manila is UTC+8, no DST). */
const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();

const startTimes = (slots: Array<{ startAt: string }>) =>
  slots.map((slot) =>
    new Date(slot.startAt).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

const booking = (overrides: Partial<BusyBooking> & { at: string }): BusyBooking => {
  const { at, ...rest } = overrides;
  const startAt = manila(MONDAY, at);
  return {
    serviceId: "haircut",
    staffId: null,
    startAt,
    endAt: new Date(Date.parse(startAt) + 60 * 60_000).toISOString(),
    bufferMin: 0,
    ...rest,
  };
};

const slotsOn = (
  date: string,
  sched: ShopSchedule,
  service: SlotService = haircut,
  bookings: BusyBooking[] = [],
  options: Partial<Parameters<typeof openSlotsOnDate>[4]> = {},
) => openSlotsOnDate(date, sched, service, bookings, { now: LONG_AGO, ...options });

describe("weekly hours and breaks", () => {
  it("steps every 30 minutes from opening, ending by closing time", () => {
    const slots = slotsOn(MONDAY, schedule());
    expect(startTimes(slots)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(slots[0]).toEqual({
      startAt: "2026-12-07T01:00:00.000Z",
      endAt: "2026-12-07T02:00:00.000Z",
      remaining: 1,
      staffIds: [],
    });
  });

  it("returns nothing on a weekday without hours", () => {
    expect(slotsOn(SUNDAY, schedule())).toEqual([]);
  });

  it("skips the break and restarts the grid when it ends", () => {
    const sched = schedule({ hours: [day(1, "09:00", "15:00", ["12:15", "13:00"])] });
    expect(startTimes(slotsOn(MONDAY, sched))).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "13:00",
      "13:30",
      "14:00",
    ]);
  });

  it("only offers start times where the whole service fits", () => {
    const longService = { ...haircut, durationMin: 150 };
    expect(startTimes(slotsOn(MONDAY, schedule(), longService))).toEqual(["09:00", "09:30"]);
  });
});

describe("closures", () => {
  it("removes slots that overlap a partial closure", () => {
    const sched = schedule({
      closures: [{ startsAt: manila(MONDAY, "10:00"), endsAt: manila(MONDAY, "11:00") }],
    });
    expect(startTimes(slotsOn(MONDAY, sched))).toEqual(["09:00", "11:00"]);
  });

  it("closes the whole day for an all-day closure", () => {
    const sched = schedule({
      closures: [
        { startsAt: manila(MONDAY, "00:00"), endsAt: manila(addDays(MONDAY, 1), "00:00") },
      ],
    });
    expect(slotsOn(MONDAY, sched)).toEqual([]);
  });
});

describe("buffer and capacity", () => {
  it("keeps the next start clear of a booking and its buffer", () => {
    const service = { ...haircut, bufferMin: 15 };
    const bookings = [booking({ at: "09:00", bufferMin: 15 })];
    // Busy 9:00–10:15; a 10:00 start would also need its own 15 minutes after.
    expect(startTimes(slotsOn(MONDAY, schedule(), service, bookings))).toEqual(["10:30", "11:00"]);
  });

  it("needs the candidate's own buffer clear of the next booking", () => {
    const service = { ...haircut, bufferMin: 15 };
    const bookings = [booking({ at: "11:00" })];
    expect(startTimes(slotsOn(MONDAY, schedule(), service, bookings))).toEqual(["09:00", "09:30"]);
  });

  it("lets a buffer run past closing time", () => {
    const service = { ...haircut, bufferMin: 30 };
    expect(startTimes(slotsOn(MONDAY, schedule(), service))).toContain("11:00");
  });

  it("counts overlapping bookings of the same service against capacity", () => {
    const service = { ...haircut, capacity: 2 };
    const one = slotsOn(MONDAY, schedule(), service, [booking({ at: "09:00" })]);
    expect(one[0]).toMatchObject({ startAt: manila(MONDAY, "09:00"), remaining: 1 });

    const two = slotsOn(MONDAY, schedule(), service, [
      booking({ at: "09:00" }),
      booking({ at: "09:30" }),
    ]);
    // 9:00 and 9:30 overlap both bookings; 10:00 overlaps only the 9:30 one.
    expect(startTimes(two)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("ignores other services' bookings when the shop doesn't schedule by staff", () => {
    const bookings = [booking({ at: "09:00", serviceId: "shave" })];
    expect(startTimes(slotsOn(MONDAY, schedule(), haircut, bookings))).toContain("09:00");
  });
});

describe("notice", () => {
  it("hides past slots and those inside the minimum notice", () => {
    const now = new Date(manila(MONDAY, "09:10"));
    expect(startTimes(slotsOn(MONDAY, schedule(), haircut, [], { now }))).toEqual([
      "10:00",
      "10:30",
      "11:00",
    ]);
  });
});

describe("holiday rules", () => {
  const CHRISTMAS = "2026-12-25"; // Friday
  const CHRISTMAS_EVE = "2026-12-24"; // Thursday
  const longDays = schedule({
    hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) =>
      day(weekday, "09:00", "19:00", ["12:00", "13:00"]),
    ),
  });

  it("keeps normal hours on a holiday without a rule", () => {
    expect(slotsOn(CHRISTMAS, longDays).length).toBeGreaterThan(0);
  });

  it("closes on a holiday the shop closes on", () => {
    const sched = {
      ...longDays,
      holidayRules: [{ holidayKey: "christmas_day", opens: null, closes: null }],
    };
    expect(slotsOn(CHRISTMAS, sched)).toEqual([]);
    expect(slotsOn(CHRISTMAS_EVE, sched).length).toBeGreaterThan(0);
  });

  it("replaces the day's hours (and break) with special hours", () => {
    const sched = {
      ...longDays,
      holidayRules: [{ holidayKey: "christmas_eve", opens: "10:00", closes: "13:00" }],
    };
    expect(startTimes(slotsOn(CHRISTMAS_EVE, sched))).toEqual([
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
    ]);
  });

  it("opens a normally closed weekday for special hours", () => {
    const sched = schedule({
      hours: [],
      holidayRules: [{ holidayKey: "christmas_eve", opens: "10:00", closes: "11:00" }],
    });
    expect(startTimes(slotsOn(CHRISTMAS_EVE, sched))).toEqual(["10:00"]);
  });
});

describe("staff schedules", () => {
  const ana: StaffSchedule = { userId: "ana", usesShopHours: true, hours: [], timeOff: [] };
  const ben: StaffSchedule = { userId: "ben", usesShopHours: true, hours: [], timeOff: [] };
  const twoChairs = { ...haircut, capacity: 2 };

  it("lists the free staff and caps remaining at capacity", () => {
    const slots = slotsOn(MONDAY, schedule({ staff: [ana, ben] }), twoChairs);
    expect(slots[0]).toMatchObject({ remaining: 2, staffIds: ["ana", "ben"] });
  });

  it("takes a booked staff member out of the slot", () => {
    const bookings = [booking({ at: "09:00", staffId: "ana", serviceId: "shave" })];
    const slots = slotsOn(MONDAY, schedule({ staff: [ana, ben] }), twoChairs, bookings);
    expect(slots[0]).toMatchObject({ remaining: 1, staffIds: ["ben"] });
  });

  it("lets an unassigned booking use up a free staff member", () => {
    const bookings = [booking({ at: "09:00", serviceId: "shave" })];
    const slots = slotsOn(MONDAY, schedule({ staff: [ana] }), twoChairs, bookings);
    expect(startTimes(slots)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("limits custom hours to the shop's hours", () => {
    const custom = { ...ana, usesShopHours: false, hours: [day(1, "10:00", "18:00")] };
    const slots = slotsOn(MONDAY, schedule({ staff: [custom] }), haircut, [], { staffId: "ana" });
    expect(startTimes(slots)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("gives a staff member nothing on their day off", () => {
    const custom = { ...ana, usesShopHours: false, hours: [day(2, "09:00", "12:00")] };
    expect(slotsOn(MONDAY, schedule({ staff: [custom] }))).toEqual([]);
  });

  it("respects time off", () => {
    const away = {
      ...ben,
      timeOff: [{ startsAt: manila(MONDAY, "09:00"), endsAt: manila(MONDAY, "10:00") }],
    };
    const sched = schedule({ staff: [ana, away] });
    expect(startTimes(slotsOn(MONDAY, sched, haircut, [], { staffId: "ben" }))).toEqual([
      "10:00",
      "10:30",
      "11:00",
    ]);
    expect(slotsOn(MONDAY, sched)[0]).toMatchObject({ staffIds: ["ana"] });
  });

  it("returns nothing for someone who doesn't take bookings", () => {
    expect(slotsOn(MONDAY, schedule({ staff: [ana] }), haircut, [], { staffId: "ben" })).toEqual(
      [],
    );
  });

  it("filters to one staff member's free slots", () => {
    const bookings = [booking({ at: "09:00", staffId: "ana" })];
    const slots = slotsOn(MONDAY, schedule({ staff: [ana, ben] }), twoChairs, bookings, {
      staffId: "ana",
    });
    expect(startTimes(slots)).toEqual(["10:00", "10:30", "11:00"]);
    expect(slots[0]).toMatchObject({ remaining: 1, staffIds: ["ana"] });
  });
});

describe("findOpenSlot", () => {
  it("finds an open start time and rejects a taken one", () => {
    const bookings = [booking({ at: "10:00" })];
    const args = [MONDAY, schedule(), haircut, bookings, { now: LONG_AGO }] as const;
    expect(findOpenSlot(manila(MONDAY, "09:00"), ...args)).toMatchObject({ remaining: 1 });
    expect(findOpenSlot(manila(MONDAY, "10:00"), ...args)).toBeNull();
    expect(findOpenSlot(manila(MONDAY, "09:15"), ...args)).toBeNull();
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});
