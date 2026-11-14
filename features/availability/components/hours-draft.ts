import { dayHoursProblem, WEEKDAYS, type DayHours } from "../constants";

/** One editable row of a weekly-hours form. */
export type DayDraft = {
  weekday: number;
  open: boolean;
  opens: string;
  closes: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
};

const DEFAULT_DAY = { opens: "09:00", closes: "18:00", breakStart: "12:00", breakEnd: "13:00" };

/** Saved hours as seven form rows, Monday first. */
export function toDraft(hours: readonly DayHours[]): DayDraft[] {
  return WEEKDAYS.map(({ weekday }) => {
    const saved = hours.find((day) => day.weekday === weekday);
    return {
      weekday,
      open: !!saved,
      opens: saved?.opens ?? DEFAULT_DAY.opens,
      closes: saved?.closes ?? DEFAULT_DAY.closes,
      hasBreak: !!saved?.breakStart,
      breakStart: saved?.breakStart ?? DEFAULT_DAY.breakStart,
      breakEnd: saved?.breakEnd ?? DEFAULT_DAY.breakEnd,
    };
  });
}

/** The open rows as the hours an action expects. */
export function fromDraft(draft: readonly DayDraft[]): DayHours[] {
  return draft
    .filter((day) => day.open)
    .map((day) => ({
      weekday: day.weekday,
      opens: day.opens,
      closes: day.closes,
      breakStart: day.hasBreak ? day.breakStart : null,
      breakEnd: day.hasBreak ? day.breakEnd : null,
    }));
}

/** A problem per open weekday that has one. */
export function draftProblems(draft: readonly DayDraft[]): Map<number, string> {
  const problems = new Map<number, string>();
  for (const day of fromDraft(draft)) {
    const problem = dayHoursProblem(day);
    if (problem) problems.set(day.weekday, problem);
  }
  return problems;
}
