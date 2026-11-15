import { describe, expect, it } from "vitest";

import { formatManila, manilaDate, manilaToUtc, manilaWeekday, startOfManilaDay } from "@/lib/time";

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
