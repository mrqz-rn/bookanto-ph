"use client";

import { Copy, Plus, X } from "lucide-react";
import { cn } from "cn";

import { Input } from "@/components/ui/input";

import { WEEKDAYS } from "../constants";
import { draftProblems, fromDraft, type DayDraft } from "./hours-draft";
import { DayTimeline, hoursLabel, SwitchField, timelineSpan } from "./panel";

type Props = {
  /** Keeps input ids unique when several editors share a page. */
  idPrefix: string;
  value: DayDraft[];
  onChange: (value: DayDraft[]) => void;
  disabled?: boolean;
};

const TIME = "h-11 w-full min-w-0 text-base tabular-nums sm:w-32";

/** Seven rows, Monday first: open or closed, hours, an optional break, and the day drawn as a bar. */
export function WeekHoursEditor({ idPrefix, value, onChange, disabled }: Props) {
  const problems = draftProblems(value);
  const firstOpen = value.find((day) => day.open);
  const span = timelineSpan(fromDraft(value).filter((day) => day.closes > day.opens));
  const firstOpenName = firstOpen && WEEKDAYS.find((d) => d.weekday === firstOpen.weekday)?.label;

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
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {value.map((day) => {
          const name = WEEKDAYS.find((entry) => entry.weekday === day.weekday)!.label;
          const id = `${idPrefix}-${day.weekday}`;
          const problem = problems.get(day.weekday);
          return (
            <li
              key={day.weekday}
              className={cn(
                "grid gap-3 p-3 sm:grid-cols-[11rem_1fr] sm:items-start sm:gap-4 sm:p-4",
                !day.open && "bg-neutral-50",
              )}
            >
              <SwitchField
                id={`${id}-open`}
                checked={day.open}
                disabled={disabled}
                onChange={(open) => update(day.weekday, { open })}
                label={
                  <>
                    {name}
                    <span className="sr-only">{day.open ? ", open" : ", closed"}</span>
                  </>
                }
              />

              {day.open ? (
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
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
                        className={TIME}
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
                        className={TIME}
                      />
                    </div>

                    {!day.hasBreak && !disabled && (
                      <button
                        type="button"
                        onClick={() => update(day.weekday, { hasBreak: true })}
                        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-green-700 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        Add break<span className="sr-only"> on {name}</span>
                      </button>
                    )}

                    {day.hasBreak && (
                      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 lg:w-auto lg:border-l lg:border-border lg:pl-4">
                        <span className="w-full text-sm font-semibold text-slate-600 sm:w-auto">
                          Break
                        </span>
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
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
                            className={TIME}
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
                            className={TIME}
                          />
                        </div>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => update(day.weekday, { hasBreak: false })}
                            aria-label={`Remove ${name} break`}
                            className="grid size-11 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-muted hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                          >
                            <X aria-hidden="true" className="size-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {problem ? (
                    <p id={`${id}-problem`} className="text-sm font-medium text-danger">
                      {problem}
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <DayTimeline
                        opens={day.opens}
                        closes={day.closes}
                        breakStart={day.hasBreak ? day.breakStart : null}
                        breakEnd={day.hasBreak ? day.breakEnd : null}
                        span={span}
                        className="flex-1"
                      />
                      <span className="shrink-0 text-xs font-medium text-slate-600 tabular-nums">
                        {hoursLabel(day.opens, day.closes)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-base text-slate-600 sm:flex sm:min-h-11 sm:items-center">
                  Closed all day
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {firstOpen && !disabled && (
        <button
          type="button"
          onClick={copyToOpenDays}
          className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-navy-900 transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:hover:-translate-y-px"
        >
          <Copy aria-hidden="true" className="size-4" />
          Copy {firstOpenName} to every open day
        </button>
      )}
    </div>
  );
}
