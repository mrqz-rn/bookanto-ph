"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { setHolidayRules } from "../actions";
import { HOLIDAY_KIND_LABELS, HOLIDAY_TEMPLATES, type HolidayKind } from "../holidays";
import { FormMessage, selectClass, type FormState } from "./panel";

export type HolidayRow = {
  key: string;
  name: string;
  kind: HolidayKind;
  /** "Fri, Dec 25, 2026", or null when this year's date isn't announced yet. */
  dateLabel: string | null;
  movable: boolean;
};

type Mode = "normal" | "closed" | "special";
type RuleDraft = { mode: Mode; opens: string; closes: string };
type SavedRule = { holidayKey: string; opens: string | null; closes: string | null };

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

  return (
    <div>
      {canEdit && (
        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">Start from a template</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {HOLIDAY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.closedOn)}
                className="min-h-11 rounded-lg border border-border bg-background p-3 text-left hover:border-green-700 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="block text-sm font-semibold text-navy-900">{template.label}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{template.description}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            A template fills in the list below. Nothing changes until you save.
          </p>
        </fieldset>
      )}

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {holidays.map((holiday) => {
          const rule = ruleFor(holiday.key);
          const id = `holiday-${holiday.key}`;
          return (
            <li key={holiday.key} className="gap-3 p-3 sm:flex sm:items-center sm:justify-between">
              <div className="min-w-0">
                <label htmlFor={`${id}-mode`} className="font-medium text-navy-900">
                  {holiday.name}
                </label>
                <p className="text-xs text-slate-600">
                  {holiday.dateLabel ?? "Date not announced yet"}
                  {holiday.movable && holiday.dateLabel && " (estimate; may move by proclamation)"}
                  {" · "}
                  {HOLIDAY_KIND_LABELS[holiday.kind]}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-nowrap">
                <select
                  id={`${id}-mode`}
                  value={rule.mode}
                  disabled={!canEdit || pending}
                  onChange={(event) => update(holiday.key, { mode: event.target.value as Mode })}
                  className={`${selectClass} sm:w-44`}
                >
                  <option value="normal">Normal hours</option>
                  <option value="closed">Closed</option>
                  <option value="special">Special hours</option>
                </select>
                {rule.mode === "special" && (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
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
                      className="sm:w-32"
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
                      className="sm:w-32"
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        <>
          {invalid && (
            <p className="mt-3 text-sm text-danger">
              Special hours need a closing time after the opening time.
            </p>
          )}
          <Button type="button" onClick={save} disabled={pending || invalid} className="mt-4">
            {pending ? "Saving…" : "Save holidays"}
          </Button>
          <FormMessage state={state} />
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Only the owner or a manager can change holiday hours.
        </p>
      )}
    </div>
  );
}
