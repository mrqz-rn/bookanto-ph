"use client";

import { Input } from "@/components/ui/input";

import { WEEKDAYS } from "../constants";
import { draftProblems, type DayDraft } from "./hours-draft";
import { CheckField } from "./panel";

type Props = {
  /** Keeps input ids unique when several editors share a page. */
  idPrefix: string;
  value: DayDraft[];
  onChange: (value: DayDraft[]) => void;
  disabled?: boolean;
};

/** Seven rows, Monday first: open or closed, hours, and an optional break. */
export function WeekHoursEditor({ idPrefix, value, onChange, disabled }: Props) {
  const problems = draftProblems(value);
  const firstOpen = value.find((day) => day.open);

  const update = (weekday: number, patch: Partial<DayDraft>) =>
    onChange(value.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)));

  const copyToOpenDays = () => {
    if (!firstOpen) return;
    const { opens, closes, hasBreak, breakStart, breakEnd } = firstOpen;
    onChange(
      value.map((day) =>
        day.open ? { ...day, opens, closes, hasBreak, breakStart, breakEnd } : day,
      ),
    );
  };

  return (
    <div>
      {firstOpen && !disabled && (
        <button
          type="button"
          onClick={copyToOpenDays}
          className="mb-3 min-h-11 text-sm font-semibold text-green-700 underline underline-offset-4 hover:text-green-800"
        >
          Use {WEEKDAYS.find((day) => day.weekday === firstOpen.weekday)?.label}&apos;s hours on
          every open day
        </button>
      )}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {value.map((day) => {
          const name = WEEKDAYS.find((entry) => entry.weekday === day.weekday)!.label;
          const id = `${idPrefix}-${day.weekday}`;
          const problem = problems.get(day.weekday);
          return (
            <li key={day.weekday} className="p-3 sm:flex sm:items-start sm:gap-4">
              <CheckField
                id={`${id}-open`}
                checked={day.open}
                disabled={disabled}
                onChange={(open) => update(day.weekday, { open })}
                label={
                  <span className="w-24">
                    {name}
                    {!day.open && <span className="sr-only"> (closed)</span>}
                  </span>
                }
              />

              {day.open ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`${id}-opens`} className="sr-only">
                      {name} opens
                    </label>
                    <Input
                      id={`${id}-opens`}
                      type="time"
                      step={300}
                      value={day.opens}
                      disabled={disabled}
                      aria-invalid={!!problem}
                      onChange={(event) => update(day.weekday, { opens: event.target.value })}
                      className="w-full sm:w-36"
                    />
                    <span aria-hidden="true" className="text-slate-600">
                      to
                    </span>
                    <label htmlFor={`${id}-closes`} className="sr-only">
                      {name} closes
                    </label>
                    <Input
                      id={`${id}-closes`}
                      type="time"
                      step={300}
                      value={day.closes}
                      disabled={disabled}
                      aria-invalid={!!problem}
                      aria-describedby={problem ? `${id}-problem` : undefined}
                      onChange={(event) => update(day.weekday, { closes: event.target.value })}
                      className="w-full sm:w-36"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CheckField
                      id={`${id}-break`}
                      checked={day.hasBreak}
                      disabled={disabled}
                      onChange={(hasBreak) => update(day.weekday, { hasBreak })}
                      label="Break"
                    />
                    {day.hasBreak && (
                      <div className="flex flex-1 items-center gap-2">
                        <label htmlFor={`${id}-break-start`} className="sr-only">
                          {name} break starts
                        </label>
                        <Input
                          id={`${id}-break-start`}
                          type="time"
                          step={300}
                          value={day.breakStart}
                          disabled={disabled}
                          onChange={(event) =>
                            update(day.weekday, { breakStart: event.target.value })
                          }
                          className="w-full sm:w-36"
                        />
                        <span aria-hidden="true" className="text-slate-600">
                          to
                        </span>
                        <label htmlFor={`${id}-break-end`} className="sr-only">
                          {name} break ends
                        </label>
                        <Input
                          id={`${id}-break-end`}
                          type="time"
                          step={300}
                          value={day.breakEnd}
                          disabled={disabled}
                          onChange={(event) =>
                            update(day.weekday, { breakEnd: event.target.value })
                          }
                          className="w-full sm:w-36"
                        />
                      </div>
                    )}
                  </div>

                  {problem && (
                    <p id={`${id}-problem`} className="text-sm text-danger">
                      {problem}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-600 sm:min-h-11 sm:content-center">Closed</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
