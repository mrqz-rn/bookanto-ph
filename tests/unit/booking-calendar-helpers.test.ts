import { describe, expect, it } from "vitest";

import {
  addMonths,
  closedAllDay,
  closuresOn,
  hourRange,
  isDateKey,
  layoutDay,
  loadWindow,
  manilaMinutes,
  monthGridOf,
  rangeTitle,
  stepDate,
  weekOf,
  windowInstants,
} from "@/features/bookings/calendar";
import type { BookingListItem } from "@/features/bookings/constants";

function booking(id: string, startAt: string, durationMin: number): BookingListItem {
  return {
    id,
    refCode: id,
    customerId: null,
    customerName: "Guest",
    customerPhone: null,
    shopId: "shop",
    serviceId: "srv",
    serviceName: "Haircut",
    serviceDurationMin: durationMin,
    staffId: null,
    staffName: null,
    startAt,
    endAt: null,
    status: "confirmed",
    address: null,
    notes: null,
    quotedPriceCentavos: null,
    totalCentavos: 25000,
    isWalkIn: false,
    createdAt: startAt,
  };
}

describe("calendar date keys", () => {
  it("accepts only real dates", () => {
    expect(isDateKey("2026-11-20")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-1-5")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });

  it("builds a Sunday-to-Saturday week", () => {
    expect(weekOf("2026-11-20")).toEqual([
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
    ]);
  });

  it("covers a month in whole weeks", () => {
    const days = monthGridOf("2026-11-20");
    expect(days[0]).toBe("2026-11-01");
    expect(days.at(-1)).toBe("2026-12-05");
    expect(days.length % 7).toBe(0);
  });

  it("steps months without overflowing short ones", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
    expect(stepDate("month", "2027-01-31", 1)).toBe("2027-02-28");
    expect(stepDate("week", "2026-11-28", 1)).toBe("2026-12-05");
  });

  it("titles a week that crosses a month or a year", () => {
    expect(rangeTitle("week", "2026-11-18")).toBe("Nov 15 – 21, 2026");
    expect(rangeTitle("week", "2026-12-01")).toBe("Nov 29 – Dec 5, 2026");
    expect(rangeTitle("week", "2026-12-30")).toBe("Dec 27, 2026 – Jan 2, 2027");
    expect(rangeTitle("month", "2026-11-18")).toBe("November 2026");
  });

  it("loads three months and bounds them in Manila time", () => {
    const window = loadWindow("2026-11-20");
    expect(window).toEqual({ from: "2026-09-27", to: "2027-01-02" });
    expect(windowInstants(window).startIso).toBe("2026-09-26T16:00:00.000Z");
  });
});

describe("calendar layout", () => {
  it("reads minutes in Manila time", () => {
    expect(manilaMinutes("2026-11-20T06:30:00.000Z")).toBe(14 * 60 + 30);
  });

  it("puts overlapping bookings side by side and lone ones full width", () => {
    // 9:00-10:00, 9:30-10:00, then 10:00-10:30 (Manila): two lanes, then one.
    const placed = layoutDay([
      booking("a", "2026-11-20T01:00:00.000Z", 60),
      booking("b", "2026-11-20T01:30:00.000Z", 30),
      booking("c", "2026-11-20T02:00:00.000Z", 30),
    ]);
    const byId = Object.fromEntries(placed.map((p) => [p.booking.id, p]));
    expect(byId.a).toMatchObject({ lane: 0, lanes: 2 });
    expect(byId.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(byId.c).toMatchObject({ lane: 0, lanes: 1 });
  });

  it("draws from the earliest opening to the latest closing, widened for bookings", () => {
    const hours = [
      { weekday: 5, opens: "09:00:00", closes: "18:00:00", breakStart: null, breakEnd: null },
    ];
    expect(hourRange(hours, [])).toEqual({ startHour: 9, endHour: 18 });
    // A 7:30 PM booking (Manila) for an hour pushes the end to 9 PM.
    expect(hourRange(hours, [booking("late", "2026-11-20T11:30:00.000Z", 60)])).toEqual({
      startHour: 9,
      endHour: 21,
    });
    expect(hourRange([], [])).toEqual({ startHour: 8, endHour: 20 });
  });

  it("finds the part of a day a closure covers", () => {
    const closures = [
      {
        startsAt: "2026-11-20T04:00:00.000Z",
        endsAt: "2026-11-22T16:00:00.000Z",
        reason: "Fiesta",
      },
    ];
    expect(closuresOn(closures, "2026-11-20")).toEqual([
      { startMin: 12 * 60, endMin: 24 * 60, label: "Closed: Fiesta" },
    ]);
    const saturday = closuresOn(closures, "2026-11-21");
    expect(saturday).toEqual([{ startMin: 0, endMin: 24 * 60, label: "Closed: Fiesta" }]);
    expect(closedAllDay(saturday, { opensMin: 540, closesMin: 1080 })).toBe(true);
    expect(closuresOn(closures, "2026-11-23")).toEqual([]);
  });
});
