"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { setHours } from "../actions";
import type { DayHours } from "../constants";
import { draftProblems, fromDraft, toDraft } from "./hours-draft";
import { FormMessage, type FormState } from "./panel";
import { WeekHoursEditor } from "./week-hours-editor";

export function ShopHoursForm({
  shopId,
  hours,
  canEdit,
}: {
  shopId: string;
  hours: DayHours[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = React.useState(() => toDraft(hours));
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [pending, startTransition] = React.useTransition();
  const hasProblems = draftProblems(draft).size > 0;

  const save = () =>
    startTransition(async () => {
      const result = await setHours({ shopId, hours: fromDraft(draft) });
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
      {canEdit ? (
        <>
          <Button type="button" onClick={save} disabled={pending || hasProblems} className="mt-4">
            {pending ? "Saving…" : "Save hours"}
          </Button>
          <FormMessage state={state} />
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Only the owner or a manager can change hours.</p>
      )}
    </div>
  );
}
