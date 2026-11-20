"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { setHours } from "../actions";
import type { DayHours } from "../constants";
import { draftProblems, fromDraft, toDraft } from "./hours-draft";
import { formatWeekHours, FormMessage, weeklyMinutes, type FormState } from "./panel";
import { WeekHoursEditor } from "./week-hours-editor";

const PRESS =
  "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]";

export function ShopHoursForm({
  shopId,
  hours,
  canEdit,
}: {
  shopId: string;
  hours: DayHours[];
  canEdit: boolean;
}) {
  const [saved, setSaved] = React.useState(() => toDraft(hours));
  const [draft, setDraft] = React.useState(saved);
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [pending, startTransition] = React.useTransition();
  const hasProblems = draftProblems(draft).size > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const openDays = fromDraft(draft);

  const save = () =>
    startTransition(async () => {
      const result = await setHours({ shopId, hours: fromDraft(draft) });
      if (result.ok) setSaved(draft);
      setState(
        result.ok
          ? {
              kind: "success",
              message:
                result.data.openDays === 0
                  ? "Saved. Your shop shows as closed every day."
                  : `Saved. Open ${result.data.openDays} ${result.data.openDays === 1 ? "day" : "days"} a week.`,
            }
          : { kind: "error", message: result.message },
      );
    });

  return (
    <div>
      <WeekHoursEditor
        idPrefix="shop-hours"
        value={draft}
        onChange={(next) => {
          setDraft(next);
          setState({ kind: "idle" });
        }}
        disabled={!canEdit || pending}
      />

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {openDays.length === 0 ? (
            "Closed every day"
          ) : (
            <>
              <span className="font-semibold text-navy-900">
                Open {openDays.length} {openDays.length === 1 ? "day" : "days"}
              </span>
              {!hasProblems && <> · {formatWeekHours(weeklyMinutes(openDays))}</>}
            </>
          )}
          {canEdit && dirty && (
            <span className="ml-2 inline-flex items-center gap-1.5 font-semibold text-amber-800">
              <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
        </p>

        {canEdit ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(saved);
                  setState({ kind: "idle" });
                }}
                disabled={pending}
              >
                Reset
              </Button>
            )}
            <Button
              type="button"
              onClick={save}
              disabled={pending || hasProblems}
              className={PRESS}
            >
              {pending ? "Saving…" : "Save hours"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Only the owner or a manager can change hours.</p>
        )}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
