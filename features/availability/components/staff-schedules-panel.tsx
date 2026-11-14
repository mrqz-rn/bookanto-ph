"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { setStaffSchedule } from "../actions";
import type { DayHours } from "../constants";
import { draftProblems, fromDraft, toDraft } from "./hours-draft";
import { CheckField, FormMessage, type FormState } from "./panel";
import { WeekHoursEditor } from "./week-hours-editor";

export type StaffRow = {
  userId: string;
  name: string;
  role: "owner" | "manager" | "staff";
  takesBookings: boolean;
  usesShopHours: boolean;
  hours: DayHours[];
};

const ROLE_LABELS = { owner: "Owner", manager: "Manager", staff: "Staff" } as const;

export function StaffSchedulesPanel({
  shopId,
  staff,
  shopHours,
  canEdit,
}: {
  shopId: string;
  staff: StaffRow[];
  shopHours: DayHours[];
  canEdit: boolean;
}) {
  const bookable = staff.filter((member) => member.takesBookings).length;
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-slate-600">
        {bookable === 0
          ? "Nobody is set to take bookings, so slots follow the shop's hours and each service's capacity. Turn someone on to schedule by staff."
          : `${bookable} ${bookable === 1 ? "person takes" : "people take"} bookings. Each booking needs one of them free for the whole service.`}
      </p>
      {staff.map((member) => (
        <StaffCard
          key={member.userId}
          shopId={shopId}
          member={member}
          shopHours={shopHours}
          canEdit={canEdit}
        />
      ))}
      {staff.length === 1 && (
        <p className="text-sm text-slate-600">
          Just you for now. When you add staff to your shop, set their hours here.
        </p>
      )}
    </div>
  );
}

function StaffCard({
  shopId,
  member,
  shopHours,
  canEdit,
}: {
  shopId: string;
  member: StaffRow;
  shopHours: DayHours[];
  canEdit: boolean;
}) {
  const [takesBookings, setTakesBookings] = React.useState(member.takesBookings);
  const [usesShopHours, setUsesShopHours] = React.useState(member.usesShopHours);
  // Custom hours start from the shop's hours when the member has none yet.
  const [draft, setDraft] = React.useState(() =>
    toDraft(member.hours.length > 0 ? member.hours : shopHours),
  );
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [pending, startTransition] = React.useTransition();

  const customDays = fromDraft(draft);
  const problem =
    takesBookings && !usesShopHours
      ? draftProblems(draft).size > 0
        ? "Fix the hours above first."
        : customDays.length === 0
          ? "Pick at least one working day, or use the shop's hours."
          : null
      : null;

  const changed = () => setState({ kind: "idle" });
  const id = `staff-${member.userId}`;

  const save = () =>
    startTransition(async () => {
      const result = await setStaffSchedule({
        shopId,
        userId: member.userId,
        takesBookings,
        usesShopHours,
        hours: usesShopHours ? [] : customDays,
      });
      setState(
        result.ok
          ? {
              kind: "success",
              message: result.data.takesBookings
                ? `Saved. ${member.name} takes bookings.`
                : `Saved. ${member.name} won't be given bookings.`,
            }
          : { kind: "error", message: result.message },
      );
    });

  return (
    <article
      aria-labelledby={`${id}-name`}
      className="rounded-lg border border-border bg-background p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-name`} className="font-semibold text-navy-900">
          {member.name}{" "}
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-slate-600">
            {ROLE_LABELS[member.role]}
          </span>
        </h3>
        <CheckField
          id={`${id}-takes`}
          checked={takesBookings}
          disabled={!canEdit || pending}
          onChange={(checked) => {
            setTakesBookings(checked);
            changed();
          }}
          label="Takes bookings"
        />
      </div>

      {takesBookings && (
        <fieldset className="mt-2" disabled={!canEdit || pending}>
          <legend className="sr-only">{member.name}&apos;s working hours</legend>
          <div className="flex flex-wrap gap-x-6">
            <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-navy-900">
              <input
                type="radio"
                name={`${id}-hours`}
                checked={usesShopHours}
                onChange={() => {
                  setUsesShopHours(true);
                  changed();
                }}
                className="size-5 accent-green-700"
              />
              Same as shop hours
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-navy-900">
              <input
                type="radio"
                name={`${id}-hours`}
                checked={!usesShopHours}
                onChange={() => {
                  setUsesShopHours(false);
                  changed();
                }}
                className="size-5 accent-green-700"
              />
              Own hours
            </label>
          </div>
          {!usesShopHours && (
            <div className="mt-2">
              <WeekHoursEditor
                idPrefix={id}
                value={draft}
                onChange={(next) => {
                  setDraft(next);
                  changed();
                }}
                disabled={!canEdit || pending}
              />
              <p className="mt-2 text-xs text-slate-600">
                Bookings still need the shop to be open, so hours outside the shop&apos;s are
                ignored.
              </p>
            </div>
          )}
        </fieldset>
      )}

      {canEdit && (
        <div className="mt-3">
          {problem && <p className="mb-2 text-sm text-danger">{problem}</p>}
          <Button type="button" variant="outline" onClick={save} disabled={pending || !!problem}>
            {pending ? "Saving…" : `Save ${member.name}'s schedule`}
          </Button>
          <FormMessage state={state} />
        </div>
      )}
    </article>
  );
}
