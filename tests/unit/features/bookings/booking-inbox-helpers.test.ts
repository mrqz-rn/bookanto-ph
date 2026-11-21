import { describe, expect, it } from "vitest";

import type { BookingListItem } from "@/features/bookings/constants";
import {
  countByView,
  groupByDay,
  initialView,
  matchesFilters,
  summaryLine,
  viewOf,
} from "@/features/bookings/inbox";

// Sunday, November 15, 2026, 11:30 PM in Manila: late enough that UTC is still on the 15th
// while Manila's tomorrow is the 16th.
const at = (manila: string) => new Date(`2026-${manila}:00+08:00`);
const NOW = at("11-15T23:30").getTime();

function booking(id: string, overrides: Partial<BookingListItem> = {}): BookingListItem {
  return {
    id,
    refCode: `BK-${id}`,
    customerId: "c-1",
    customerName: "Maria Santos",
    customerPhone: null,
    shopId: "s-1",
    serviceId: "srv-1",
    serviceName: "Blowdry",
    serviceDurationMin: 45,
    staffId: null,
    staffName: null,
    startAt: at("11-16T10:00").toISOString(),
    endAt: null,
    status: "confirmed",
    address: null,
    notes: null,
    quotedPriceCentavos: null,
    totalCentavos: 30000,
    isWalkIn: false,
    createdAt: at("11-15T08:00").toISOString(),
    ...overrides,
  };
}

describe("viewOf", () => {
  it("sorts each status into one view", () => {
    expect(viewOf({ status: "requested" })).toBe("requests");
    expect(viewOf({ status: "quoted" })).toBe("requests");
    expect(viewOf({ status: "confirmed" })).toBe("upcoming");
    for (const status of ["completed", "no_show", "cancelled", "declined", "expired"] as const) {
      expect(viewOf({ status })).toBe("past");
    }
  });
});

describe("initialView", () => {
  it("opens on requests only when one waits", () => {
    expect(initialView([booking("a"), booking("b", { status: "requested" })])).toBe("requests");
    expect(initialView([booking("a"), booking("b", { status: "completed" })])).toBe("upcoming");
    expect(initialView([])).toBe("upcoming");
  });
});

describe("groupByDay", () => {
  it("groups by the Manila day, with today and tomorrow named", () => {
    const groups = groupByDay(
      [
        booking("late", { startAt: at("11-16T15:00").toISOString() }),
        booking("tonight", { startAt: at("11-15T23:45").toISOString() }),
        booking("early", { startAt: at("11-16T08:00").toISOString() }),
        booking("later", { startAt: at("11-19T09:00").toISOString() }),
      ],
      "upcoming",
      NOW,
    );
    expect(groups.map((g) => [g.title, g.date, g.bookings.map((b) => b.id)])).toEqual([
      ["Today", "Sun, Nov 15", ["tonight"]],
      ["Tomorrow", "Mon, Nov 16", ["early", "late"]],
      ["Thu, Nov 19", null, ["later"]],
    ]);
  });

  it("puts confirmed bookings from before today in one group at the top", () => {
    const groups = groupByDay(
      [
        booking("today", { startAt: at("11-15T09:00").toISOString() }),
        booking("friday", { startAt: at("11-13T09:00").toISOString() }),
        booking("thursday", { startAt: at("11-12T09:00").toISOString() }),
      ],
      "upcoming",
      NOW,
    );
    expect(groups.map((g) => [g.key, g.bookings.map((b) => b.id)])).toEqual([
      ["overdue", ["thursday", "friday"]],
      ["2026-11-15", ["today"]],
    ]);
    expect(groups[0]!.title).toBe("Still to mark");
  });

  it("runs past bookings latest first and adds the year for another year", () => {
    const groups = groupByDay(
      [
        booking("old", { status: "completed", startAt: at("11-01T09:00").toISOString() }),
        booking("yesterday", { status: "no_show", startAt: at("11-14T09:00").toISOString() }),
        booking("last-year", {
          status: "cancelled",
          startAt: new Date("2025-12-30T02:00:00Z").toISOString(),
        }),
        booking("not-past", { status: "confirmed" }),
      ],
      "past",
      NOW,
    );
    expect(groups.map((g) => g.title)).toEqual(["Yesterday", "Sun, Nov 1", "Tue, Dec 30, 2025"]);
  });
});

describe("matchesFilters", () => {
  const b = booking("x", {
    refCode: "BK-7Q2X",
    customerName: "Juan Luna",
    serviceName: "Haircut",
    notes: "Please use the side door",
    staffId: "st-1",
  });

  it("searches name, service, code and notes, ignoring case", () => {
    for (const search of ["juan", "HAIR", "bk-7q", "side door", "  luna "]) {
      expect(matchesFilters(b, { search, staffId: "all" })).toBe(true);
    }
    expect(matchesFilters(b, { search: "manicure", staffId: "all" })).toBe(false);
  });

  it("filters by team member, or by no one assigned", () => {
    expect(matchesFilters(b, { search: "", staffId: "st-1" })).toBe(true);
    expect(matchesFilters(b, { search: "", staffId: "st-2" })).toBe(false);
    expect(matchesFilters(b, { search: "", staffId: "none" })).toBe(false);
    expect(matchesFilters(booking("y"), { search: "", staffId: "none" })).toBe(true);
  });
});

describe("countByView and summaryLine", () => {
  const list = [
    booking("r1", { status: "requested" }),
    booking("r2", { status: "requested" }),
    booking("q", { status: "quoted" }),
    booking("c1"),
    booking("c-old", { startAt: at("11-10T09:00").toISOString() }),
    booking("done", { status: "completed" }),
  ];

  it("counts each view", () => {
    expect(countByView(list)).toEqual({ requests: 3, upcoming: 2, past: 1 });
  });

  it("counts requests the shop must answer and confirmed bookings from today on", () => {
    expect(summaryLine(list, NOW)).toBe("2 requests to answer · 1 confirmed booking coming up");
    expect(summaryLine([], NOW)).toBe("No requests waiting · no confirmed bookings coming up");
  });
});
