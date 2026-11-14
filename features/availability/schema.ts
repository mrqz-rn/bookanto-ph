import { z } from "zod";

import { CLOCK_TIME, dayHoursProblem, MAX_CLOSURE_DAYS, MAX_SLOT_DAYS } from "./constants";
import { HOLIDAY_KEYS, HOLIDAYS } from "./holidays";

const clockTime = z.string().regex(CLOCK_TIME, "Use a time like 09:30.");
const optionalClockTime = z
  .union([clockTime, z.literal("")])
  .nullish()
  .transform((value) => value || null);
const calendarDate = z.iso.date("Pick a date.");

const dayHoursSchema = z
  .strictObject({
    weekday: z.number().int().min(0).max(6),
    opens: clockTime,
    closes: clockTime,
    breakStart: optionalClockTime,
    breakEnd: optionalClockTime,
  })
  .superRefine((day, ctx) => {
    const problem = dayHoursProblem(day);
    if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["closes"] });
  });

/** Up to one entry per weekday; a weekday left out is closed. */
const weekHoursSchema = z
  .array(dayHoursSchema)
  .max(7)
  .refine((days) => new Set(days.map((day) => day.weekday)).size === days.length, {
    message: "Each day can appear only once.",
  });

export const setHoursSchema = z.strictObject({
  shopId: z.uuid(),
  hours: weekHoursSchema,
});

const reason = z
  .string()
  .trim()
  .max(200, "Keep the reason under 200 characters.")
  .nullish()
  .transform((value) => value || null);

/**
 * A closure or time-off entry as the form sends it: whole Manila days, or a
 * start and end time. Turned into UTC instants by toTimeRange() in actions.
 */
const timeRangeFields = {
  startDate: calendarDate,
  endDate: calendarDate,
  allDay: z.boolean(),
  startTime: optionalClockTime,
  endTime: optionalClockTime,
  reason,
};

type TimeRangeInput = {
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

function checkTimeRange(range: TimeRangeInput, ctx: z.RefinementCtx) {
  if (range.endDate < range.startDate) {
    ctx.addIssue({
      code: "custom",
      message: "The end date is before the start.",
      path: ["endDate"],
    });
    return;
  }
  const days = (Date.parse(range.endDate) - Date.parse(range.startDate)) / 86_400_000 + 1;
  if (days > MAX_CLOSURE_DAYS) {
    ctx.addIssue({
      code: "custom",
      message: `Keep it to ${MAX_CLOSURE_DAYS} days or fewer.`,
      path: ["endDate"],
    });
  }
  if (range.allDay) return;
  if (!range.startTime || !range.endTime) {
    ctx.addIssue({ code: "custom", message: "Enter a start and end time.", path: ["startTime"] });
  } else if (range.startDate === range.endDate && range.endTime <= range.startTime) {
    ctx.addIssue({
      code: "custom",
      message: "The end time is before the start.",
      path: ["endTime"],
    });
  }
}

export const addClosureSchema = z
  .strictObject({ shopId: z.uuid(), ...timeRangeFields })
  .superRefine(checkTimeRange);

export const removeClosureSchema = z.strictObject({
  shopId: z.uuid(),
  closureId: z.uuid(),
});

export const addTimeOffSchema = z
  .strictObject({ shopId: z.uuid(), userId: z.uuid(), ...timeRangeFields })
  .superRefine(checkTimeRange);

export const removeTimeOffSchema = z.strictObject({
  shopId: z.uuid(),
  timeOffId: z.uuid(),
});

const holidayRuleSchema = z
  .strictObject({
    holidayKey: z.enum(HOLIDAY_KEYS as [string, ...string[]]),
    // Both null: closed all day. Both set: special hours for the day.
    opens: optionalClockTime,
    closes: optionalClockTime,
  })
  .superRefine((rule, ctx) => {
    if (!rule.opens && !rule.closes) return;
    if (!rule.opens || !rule.closes) {
      ctx.addIssue({ code: "custom", message: "Enter both special-hours times.", path: ["opens"] });
    } else if (rule.closes <= rule.opens) {
      ctx.addIssue({
        code: "custom",
        message: "Closing time must be after opening time.",
        path: ["closes"],
      });
    }
  });

/** The full set of holiday rules; holidays left out keep normal hours. */
export const setHolidayRulesSchema = z.strictObject({
  shopId: z.uuid(),
  rules: z
    .array(holidayRuleSchema)
    .max(HOLIDAYS.length)
    .refine((rules) => new Set(rules.map((rule) => rule.holidayKey)).size === rules.length, {
      message: "Each holiday can appear only once.",
    }),
});

export const setStaffScheduleSchema = z
  .strictObject({
    shopId: z.uuid(),
    userId: z.uuid(),
    takesBookings: z.boolean(),
    usesShopHours: z.boolean(),
    hours: weekHoursSchema,
  })
  .refine((input) => !input.takesBookings || input.usesShopHours || input.hours.length > 0, {
    message: "Pick at least one working day, or use the shop's hours.",
    path: ["hours"],
  });

export const getOpenSlotsSchema = z.strictObject({
  serviceId: z.uuid(),
  /** First Manila date to return. */
  date: calendarDate,
  days: z.number().int().min(1).max(MAX_SLOT_DAYS).default(1),
  staffId: z.uuid().nullish(),
});

export type GetOpenSlotsInput = z.input<typeof getOpenSlotsSchema>;
