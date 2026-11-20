"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { setHolidayRules } from "../actions";
import { HOLIDAY_KIND_LABELS, HOLIDAY_TEMPLATES, type HolidayKind } from "../holidays";
import { DateTile, FormMessage, Segmented, type FormState } from "./panel";

export type HolidayRow = {
  key: string;
  name: string;
  kind: HolidayKind;
  /** "Fri, Dec 25, 2026", or null when this year's date isn't announced yet. */
  dateLabel: string | null;
  /** The date as a calendar tile ("DEC", "25"), or null when not announced. */
  tile: { month: string; day: string } | null;
  movable: boolean;
};

type Mode = "normal" | "closed" | "special";
type RuleDraft = { mode: Mode; opens: string; closes: string };
type SavedRule = { holidayKey: string; opens: string | null; closes: string | null };

const MODES = [
  { value: "normal", label: "Normal" },
  { value: "closed", label: "Closed" },
  { value: "special", label: "Special" },
] as const;

const NORMAL: RuleDraft = { mode: "normal", opens: "10:00", closes: "15:00" };

function toDraft(rules: SavedRule[]): Record<string, RuleDraft> {
  return Object.fromEntries(
    rules.map((rule) => [
      rule.holidayKey,
      rule.opens && rule.closes
        ? { mode: "special" as const, opens: rule.opens, closes: rule.closes }
        : { ...NORMAL, mode: "closed" as const },
    ]),
  );
}

export function HolidayRulesForm({
  shopId,
  holidays,
  rules,
  canEdit,
}: {
  shopId: string;
  holidays: HolidayRow[];
  rules: SavedRule[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = React.useState(() => toDraft(rules));
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [pending, startTransition] = React.useTransition();

  const ruleFor = (key: string) => draft[key] ?? NORMAL;
  const update = (key: string, patch: Partial<RuleDraft>) => {
    setDraft((current) => ({ ...current, [key]: { ...(current[key] ?? NORMAL), ...patch } }));
    setState({ kind: "idle" });
  };

  const applyTemplate = (closedOn: readonly string[]) => {
    setDraft(Object.fromEntries(closedOn.map((key) => [key, { ...NORMAL, mode: "closed" }])));
    setState({ kind: "idle" });
  };

  const invalid = Object.values(draft).some(
    (rule) => rule.mode === "special" && !(rule.opens && rule.closes && rule.closes > rule.opens),
  );

  const save = () =>
    startTransition(async () => {
      const payload = Object.entries(draft)
        .filter(([, rule]) => rule.mode !== "normal")
        .map(([holidayKey, rule]) => ({
          holidayKey,
          opens: rule.mode === "special" ? rule.opens : null,
          closes: rule.mode === "special" ? rule.closes : null,
        }));
      const result = await setHolidayRules({ shopId, rules: payload });
      if (!result.ok) {
        setState({ kind: "error", message: result.message });
        return;
      }
      const { closedOn, specialHours } = result.data;
      const parts = [
        closedOn > 0 && `closed on ${closedOn} ${closedOn === 1 ? "holiday" : "holidays"}`,
        specialHours > 0 && `special hours on ${specialHours}`,
      ].filter(Boolean);
      setState({
        kind: "success",
        message:
          parts.length > 0
            ? `Saved: ${parts.join(", ")}. This repeats every year.`
            : "Saved. Normal hours on every holiday.",
      });
    });

  const counts = Object.values(draft).reduce(
    (total, rule) => ({
      closed: total.closed + (rule.mode === "closed" ? 1 : 0),
      special: total.special + (rule.mode === "special" ? 1 : 0),
    }),
    { closed: 0, special: 0 },
  );

  return (
    <div>
      {canEdit && (
        <fieldset>
          <legend className="text-base font-semibold text-navy-900">Start from a template</legend>
          <p className="mt-0.5 text-sm text-slate-600">
            It fills in the list below. Nothing changes until you save.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {HOLIDAY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.closedOn)}
                className="min-h-11 rounded-xl border border-border bg-white p-3 text-left transition-[border-color,background-color,transform] hover:border-green-700 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:hover:-translate-y-0.5"
              >
                <span className="block text-sm font-semibold text-navy-900">{template.label}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{template.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-navy-900">Coming up</h3>
        <p className="text-sm text-slate-600">
          {counts.closed + counts.special === 0
            ? "Normal hours on every holiday"
            : [
                counts.closed > 0 && `Closed on ${counts.closed}`,
                counts.special > 0 && `special hours on ${counts.special}`,
              ]
                .filter(Boolean)
                .join(", ")}
        </p>
      </div>

      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {holidays.map((holiday) => {
          const rule = ruleFor(holiday.key);
          const id = `holiday-${holiday.key}`;
          return (
            <li
              key={holiday.key}
              className={`grid gap-3 p-3 sm:p-4 md:grid-cols-[1fr_auto] md:items-center ${
                rule.mode === "closed" ? "bg-neutral-50" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <DateTile
                  month={holiday.tile?.month ?? null}
                  day={holiday.tile?.day ?? null}
                  muted={!holiday.tile}
                />
                <div className="min-w-0">
                  <p id={`${id}-name`} className="font-semibold text-navy-900">
                    {holiday.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {holiday.dateLabel ?? "Date not announced yet"}
                    {holiday.movable && holiday.dateLabel && " (may move by proclamation)"}
                    <span className="hidden sm:inline">
                      {" · "}
                      {HOLIDAY_KIND_LABELS[holiday.kind]}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 md:w-80">
                <Segmented
                  name={`${id}-mode`}
                  legend={`${holiday.name} hours`}
                  options={MODES}
                  value={rule.mode}
                  onChange={(mode) => update(holiday.key, { mode })}
                  disabled={!canEdit || pending}
                />
                {rule.mode === "special" && (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`${id}-opens`} className="sr-only">
                      {holiday.name} opens
                    </label>
                    <Input
                      id={`${id}-opens`}
                      type="time"
                      step={300}
                      value={rule.opens}
                      disabled={!canEdit || pending}
                      onChange={(event) => update(holiday.key, { opens: event.target.value })}
                      className="h-11 min-w-0 flex-1 tabular-nums"
                    />
                    <span aria-hidden="true" className="text-slate-600">
                      to
                    </span>
                    <label htmlFor={`${id}-closes`} className="sr-only">
                      {holiday.name} closes
                    </label>
                    <Input
                      id={`${id}-closes`}
                      type="time"
                      step={300}
                      value={rule.closes}
                      disabled={!canEdit || pending}
                      aria-invalid={!(rule.closes > rule.opens)}
                      onChange={(event) => update(holiday.key, { closes: event.target.value })}
                      className="h-11 min-w-0 flex-1 tabular-nums"
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-sm ${invalid ? "font-medium text-danger" : "text-slate-600"}`}>
            {invalid
              ? "Special hours need a closing time after the opening time."
              : "Your choices repeat every year."}
          </p>
          <Button
            type="button"
            onClick={save}
            disabled={pending || invalid}
            className="motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
          >
            {pending ? "Saving…" : "Save holidays"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Only the owner or a manager can change holiday hours.
        </p>
      )}
      <FormMessage state={state} />
    </div>
  );
}
