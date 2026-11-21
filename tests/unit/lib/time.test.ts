import { describe, expect, it } from "vitest";

import {
  formatManila,
  formatManilaDateRange,
  isCalendarDate,
  manilaDate,
  manilaToUtc,
  manilaWeekday,
  startOfManilaDay,
} from "@/lib/time";

describe("formatManilaDateRange", () => {
  it("names the month and year once when they repeat", () => {
    expect(formatManilaDateRange("2026-11-03", "2026-11-21")).toBe("Nov 3–21, 2026");
    expect(formatManilaDateRange("2026-10-01", "2026-11-21")).toBe("Oct 1 – Nov 21, 2026");
    expect(formatManilaDateRange("2026-12-01", "2027-07-31")).toBe("Dec 1, 2026 – Jul 31, 2027");
    expect(formatManilaDateRange("2026-11-21", "2026-11-21")).toBe("Nov 21, 2026");
  });
});

describe("isCalendarDate", () => {
  it("accepts real dates only", () => {
    expect(isCalendarDate("2026-12-01")).toBe(true);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-1-5")).toBe(false);
    expect(isCalendarDate("yesterday")).toBe(false);
  });
});

// 2026-12-06 is a Sunday. 17:00 UTC that day is 1:00 AM Monday in Manila.
const sundayAfternoon = "2026-12-06T06:30:00Z";
const mondayEarly = "2026-12-06T17:00:00Z";

describe("Manila time helpers", () => {
  it("run in a machine time zone other than Manila", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Los_Angeles");
  });

  it("convert Manila wall-clock time to UTC", () => {
    expect(manilaToUtc("2026-12-06", "14:30").toISOString()).toBe("2026-12-06T06:30:00.000Z");
    expect(manilaToUtc("2026-12-06", "00:00").toISOString()).toBe("2026-12-05T16:00:00.000Z");
    expect(manilaToUtc("2026-12-06", "23:59:59.999").toISOString()).toBe(
      "2026-12-06T15:59:59.999Z",
    );
    expect(manilaToUtc("2026-12-06", "23:59:59").toISOString()).toBe("2026-12-06T15:59:59.000Z");
  });

  it("format instants in Manila time", () => {
    expect(formatManila(sundayAfternoon)).toBe("Sun, Dec 6 · 2:30 PM");
  });

  it("use the Manila calendar day, not the UTC one", () => {
    expect(manilaDate(mondayEarly)).toBe("2026-12-07");
    expect(manilaWeekday(mondayEarly)).toBe(1);
    expect(manilaWeekday(sundayAfternoon)).toBe(0);
    expect(startOfManilaDay(mondayEarly).toISOString()).toBe("2026-12-06T16:00:00.000Z");
  });
});
