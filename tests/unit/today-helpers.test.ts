import { describe, expect, it } from "vitest";

import type { BookingListItem, TodayHours } from "@/features/bookings/constants";
import {
  acceptVerdict,
  canCompleteAt,
  canMarkNoShowAt,
  countFor,
  firstName,
  formatDuration,
  hoursLine,
  isQuoteRequest,
  nowLineIndex,
  pickUpNext,
  requestDeadline,
} from "@/features/bookings/today";

const at = (manilaTime: string) => new Date(`2026-11-15T${manilaTime}:00+08:00`);
const ms = (manilaTime: string) => at(manilaTime).getTime();

function booking(overrides: Partial<BookingListItem>): BookingListItem {
  return {
    id: "b",
    refCode: "BK-0001",
    customerId: "c",
    customerName: "Maria Santos",
    customerPhone: null,
    shopId: "s",
    serviceId: "srv",
    serviceName: "Haircut",
    serviceDurationMin: 30,
    staffId: null,
    staffName: null,
    startAt: at("10:00").toISOString(),
    endAt: null,
    status: "confirmed",
    address: null,
    notes: null,
    quotedPriceCentavos: null,
    totalCentavos: 20000,
    isWalkIn: false,
    createdAt: at("08:00").toISOString(),
    ...overrides,
  };
}

describe("formatDuration", () => {
  it("reads like a person would say it", () => {
    expect(formatDuration(20_000)).toBe("under a minute");
    expect(formatDuration(8 * 60_000)).toBe("8 min");
    expect(formatDuration(60 * 60_000)).toBe("1 h");
    expect(formatDuration(72 * 60_000)).toBe("1 h 12 min");
  });
});

describe("requestDeadline", () => {
  it("counts down, turns urgent under 15 minutes and says when time ran out", () => {
    const request = { expiresAt: at("10:00").toISOString() };
    expect(requestDeadline(request, ms("09:00"))).toEqual({
      label: "Answer within 1 h",
      urgent: false,
      lapsed: false,
    });
    expect(requestDeadline(request, ms("09:50"))?.urgent).toBe(true);
    expect(requestDeadline(request, ms("10:01"))).toMatchObject({ lapsed: true });
    expect(requestDeadline({ expiresAt: null }, ms("09:00"))).toBeNull();
  });
});

describe("pickUpNext", () => {
  const early = booking({ id: "early", startAt: at("10:00").toISOString() });
  const late = booking({ id: "late", startAt: at("14:00").toISOString() });
  const done = booking({ id: "done", startAt: at("09:00").toISOString(), status: "completed" });

  it("picks the booking in progress, then the next one", () => {
    expect(pickUpNext([late, early, done], ms("10:10"))).toMatchObject({
      booking: { id: "early" },
      inProgress: true,
    });
    // early ends at 10:30 (start + 30 min service); after that, late is next
    expect(pickUpNext([late, early, done], ms("10:31"))).toMatchObject({
      booking: { id: "late" },
      inProgress: false,
      startsInMs: ms("14:00") - ms("10:31"),
    });
    expect(pickUpNext([late, early], ms("15:00"))).toBeNull();
  });
});

describe("nowLineIndex", () => {
  const list = [
    booking({ id: "a", startAt: at("09:00").toISOString() }),
    booking({ id: "b", startAt: at("13:00").toISOString() }),
  ];
  it("goes before the first booking still to start", () => {
    expect(nowLineIndex(list, ms("08:00"))).toBe(0);
    expect(nowLineIndex(list, ms("11:00"))).toBe(1);
    expect(nowLineIndex(list, ms("18:00"))).toBe(2);
    expect(nowLineIndex([], ms("11:00"))).toBe(-1);
  });
});

describe("rules shown as buttons", () => {
  it("matches the server: done from the start, no-show from 15 minutes after", () => {
    const b = booking({});
    expect(canCompleteAt(b, ms("09:59"))).toBe(false);
    expect(canCompleteAt(b, ms("10:00"))).toBe(true);
    expect(canMarkNoShowAt(b, ms("10:14"))).toBe(false);
    expect(canMarkNoShowAt(b, ms("10:15"))).toBe(true);
  });

  it("won't accept a quote request, an expired one or one whose time has passed", () => {
    const request = booking({ status: "requested", expiresAt: at("09:30").toISOString() });
    expect(acceptVerdict(request, ms("09:00")).allowed).toBe(true);
    expect(acceptVerdict(request, ms("09:45")).allowed).toBe(false);
    expect(acceptVerdict({ ...request, expiresAt: null }, ms("10:05")).allowed).toBe(false);

    const quote = booking({ status: "requested", bookingType: "quote" });
    expect(isQuoteRequest(quote)).toBe(true);
    expect(acceptVerdict(quote, ms("09:00")).allowed).toBe(false);
  });
});

describe("hoursLine", () => {
  const hours: TodayHours = {
    opensAt: at("09:00").toISOString(),
    closesAt: at("19:00").toISOString(),
    breakStartAt: at("12:00").toISOString(),
    breakEndAt: at("13:00").toISOString(),
    closedReason: null,
  };

  it("says what the hours mean right now", () => {
    expect(hoursLine(hours, ms("08:00"))).toBe("Opens at 9:00 AM");
    expect(hoursLine(hours, ms("10:00"))).toBe("Open until 7:00 PM");
    expect(hoursLine(hours, ms("12:30"))).toBe("On break until 1:00 PM");
    expect(hoursLine(hours, ms("19:30"))).toBe("Closed at 7:00 PM");
  });

  it("handles closures, missing hours and unknown hours", () => {
    expect(hoursLine({ ...hours, closedReason: "" }, ms("10:00"))).toBe("Closed today");
    expect(hoursLine({ ...hours, closedReason: "Fiesta" }, ms("10:00"))).toBe(
      "Closed today: Fiesta",
    );
    expect(hoursLine(null, ms("10:00"))).toBe("Closed today");
    expect(hoursLine(undefined, ms("10:00"))).toBeNull();
  });
});

describe("filters and names", () => {
  it("counts each filter", () => {
    const list = [
      booking({ status: "requested" }),
      booking({ status: "confirmed", isWalkIn: true }),
      booking({ status: "completed" }),
      booking({ status: "no_show" }),
      booking({ status: "cancelled" }),
    ];
    expect(countFor(list, "all")).toBe(5);
    expect(countFor(list, "todo")).toBe(2);
    expect(countFor(list, "finished")).toBe(2);
    expect(countFor(list, "walk_ins")).toBe(1);
  });

  it("calls people by their first name", () => {
    expect(firstName("Juan dela Cruz")).toBe("Juan");
    expect(firstName("  Ana ")).toBe("Ana");
  });
});
