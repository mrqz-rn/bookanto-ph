import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { dayHoursProblem, formatClock } from "@/features/availability/constants";
import {
  addClosureSchema,
  setHolidayRulesSchema,
  setHoursSchema,
} from "@/features/availability/schema";

const shopId = randomUUID();
const day = { weekday: 1, opens: "09:00", closes: "18:00", breakStart: null, breakEnd: null };

describe("day hours", () => {
  it.each([
    [{ ...day }, null],
    [{ ...day, closes: "09:00" }, "Closing time must be after opening time."],
    [
      { ...day, breakStart: "12:00", breakEnd: null },
      "Enter both break times, or remove the break.",
    ],
    [{ ...day, breakStart: "13:00", breakEnd: "12:00" }, "The break must end after it starts."],
    [
      { ...day, breakStart: "17:30", breakEnd: "18:30" },
      "The break must start after opening and end before closing.",
    ],
  ])("checks %o", (hours, problem) => {
    expect(dayHoursProblem(hours)).toBe(problem);
  });

  it("formats 24-hour times for people", () => {
    expect(formatClock("00:15")).toBe("12:15 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
    expect(formatClock("19:30")).toBe("7:30 PM");
  });
});

describe("setHoursSchema", () => {
  it("accepts a closed week and turns blank breaks into null", () => {
    expect(setHoursSchema.parse({ shopId, hours: [] }).hours).toEqual([]);
    const parsed = setHoursSchema.parse({
      shopId,
      hours: [{ ...day, breakStart: "", breakEnd: "" }],
    });
    expect(parsed.hours[0]).toMatchObject({ breakStart: null, breakEnd: null });
  });

  it("rejects the same weekday twice and unknown fields", () => {
    expect(setHoursSchema.safeParse({ shopId, hours: [day, day] }).success).toBe(false);
    expect(setHoursSchema.safeParse({ shopId, hours: [], extra: 1 }).success).toBe(false);
  });
});

describe("addClosureSchema", () => {
  const closure = { shopId, startDate: "2026-12-24", endDate: "2026-12-24", allDay: true };

  it("needs times unless it's all day", () => {
    expect(addClosureSchema.safeParse(closure).success).toBe(true);
    expect(addClosureSchema.safeParse({ ...closure, allDay: false }).success).toBe(false);
    expect(
      addClosureSchema.safeParse({
        ...closure,
        allDay: false,
        startTime: "15:00",
        endTime: "14:00",
      }).success,
    ).toBe(false);
  });

  it("allows an overnight range across two dates", () => {
    const overnight = {
      ...closure,
      endDate: "2026-12-25",
      allDay: false,
      startTime: "20:00",
      endTime: "08:00",
    };
    expect(addClosureSchema.safeParse(overnight).success).toBe(true);
  });

  it("rejects an end before the start and very long ranges", () => {
    expect(addClosureSchema.safeParse({ ...closure, endDate: "2026-12-23" }).success).toBe(false);
    expect(addClosureSchema.safeParse({ ...closure, endDate: "2027-06-01" }).success).toBe(false);
  });
});

describe("setHolidayRulesSchema", () => {
  it("needs both special-hours times, in order", () => {
    const rule = (opens: string | null, closes: string | null) => ({
      shopId,
      rules: [{ holidayKey: "christmas_eve", opens, closes }],
    });
    expect(setHolidayRulesSchema.safeParse(rule(null, null)).success).toBe(true);
    expect(setHolidayRulesSchema.safeParse(rule("10:00", "15:00")).success).toBe(true);
    expect(setHolidayRulesSchema.safeParse(rule("10:00", null)).success).toBe(false);
    expect(setHolidayRulesSchema.safeParse(rule("15:00", "10:00")).success).toBe(false);
  });

  it("rejects the same holiday twice", () => {
    const closed = { holidayKey: "christmas_day", opens: null, closes: null };
    expect(setHolidayRulesSchema.safeParse({ shopId, rules: [closed, closed] }).success).toBe(
      false,
    );
  });
});
