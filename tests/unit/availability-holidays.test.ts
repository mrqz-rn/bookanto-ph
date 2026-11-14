import { describe, expect, it } from "vitest";

import {
  easterSunday,
  getHoliday,
  HOLIDAY_KEYS,
  HOLIDAY_TEMPLATES,
  holidayDate,
  holidaysInYear,
  holidaysOn,
  upcomingHolidays,
} from "@/features/availability/holidays";

const dateOf = (key: string, year: number) => holidayDate(getHoliday(key)!, year);

describe("holiday calendar", () => {
  it("computes Easter Sunday", () => {
    expect(easterSunday(2024)).toBe("2024-03-31");
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("places Holy Week relative to Easter", () => {
    expect(dateOf("maundy_thursday", 2026)).toBe("2026-04-02");
    expect(dateOf("good_friday", 2026)).toBe("2026-04-03");
    expect(dateOf("black_saturday", 2026)).toBe("2026-04-04");
    expect(dateOf("maundy_thursday", 2027)).toBe("2027-03-25");
  });

  it("puts National Heroes Day on the last Monday of August", () => {
    expect(dateOf("national_heroes_day", 2025)).toBe("2025-08-25");
    expect(dateOf("national_heroes_day", 2026)).toBe("2026-08-31");
    expect(dateOf("national_heroes_day", 2027)).toBe("2027-08-30");
  });

  it("uses listed dates for proclaimed holidays and nothing for unknown years", () => {
    expect(dateOf("chinese_new_year", 2027)).toBe("2027-02-06");
    expect(dateOf("eid_al_fitr", 2026)).toBe("2026-03-20");
    expect(dateOf("eid_al_fitr", 2035)).toBeNull();
  });

  it("finds the holidays on a date", () => {
    expect(holidaysOn("2026-12-25").map((holiday) => holiday.key)).toEqual(["christmas_day"]);
    expect(holidaysOn("2026-12-26")).toEqual([]);
  });

  it("lists a year's holidays in date order", () => {
    const dates = holidaysInYear(2026).map((holiday) => holiday.date);
    expect(dates).toEqual([...dates].sort());
    expect(dates[0]).toBe("2026-01-01");
    expect(dates.at(-1)).toBe("2026-12-31");
  });

  it("finds each holiday's next date, rolling into next year", () => {
    const upcoming = new Map(
      upcomingHolidays("2026-11-14").map((holiday) => [holiday.key, holiday.date]),
    );
    expect(upcoming.get("bonifacio_day")).toBe("2026-11-30");
    expect(upcoming.get("new_years_day")).toBe("2027-01-01");
    expect(upcoming.get("all_saints_day")).toBe("2027-11-01");
  });

  it("has unique keys that fit the database check", () => {
    expect(new Set(HOLIDAY_KEYS).size).toBe(HOLIDAY_KEYS.length);
    for (const key of HOLIDAY_KEYS) expect(key).toMatch(/^[a-z0-9_]{1,50}$/);
  });

  it("builds templates only from known holidays", () => {
    for (const template of HOLIDAY_TEMPLATES) {
      for (const key of template.closedOn) expect(HOLIDAY_KEYS).toContain(key);
    }
    expect(HOLIDAY_TEMPLATES.find((t) => t.id === "regular")!.closedOn).toHaveLength(12);
  });
});
