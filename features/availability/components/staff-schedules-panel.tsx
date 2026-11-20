"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { setStaffSchedule } from "../actions";
import type { DayHours } from "../constants";
import { draftProblems, fromDraft, toDraft } from "./hours-draft";
import { WEEKDAYS } from "../constants";
import { FormMessage, hoursLabel, Segmented, SwitchField, type FormState } from "./panel";
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
    <div className="space-y-4">
      <p className="rounded-xl bg-muted px-4 py-3 text-sm text-slate-600">
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

  const workingDays: Array<{ weekday: number; opens: string; closes: string }> = usesShopHours
    ? shopHours
    : customDays;
  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article aria-labelledby={`${id}-name`} className="rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-display text-base font-bold text-green-800"
          >
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <h3 id={`${id}-name`} className="truncate font-semibold text-navy-900">
              {member.name}
            </h3>
            <p className="text-sm text-slate-600">{ROLE_LABELS[member.role]}</p>
          </div>
        </div>
        <SwitchField
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
        <div className="space-y-4 border-t border-border p-4">
          <Segmented
            name={`${id}-hours`}
            legend={`${member.name}'s working hours`}
            options={[
              { value: "shop", label: "Shop hours" },
              { value: "own", label: "Own hours" },
            ]}
            value={usesShopHours ? "shop" : "own"}
            onChange={(choice) => {
              setUsesShopHours(choice === "shop");
              changed();
            }}
            disabled={!canEdit || pending}
            className="sm:max-w-xs"
          />

          {usesShopHours ? (
            <ul aria-label={`${member.name}'s working days`} className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const hours = workingDays.find((entry) => entry.weekday === day.weekday);
                return (
                  <li
                    key={day.weekday}
                    className={`rounded-lg px-1 py-2 text-center ${
                      hours ? "bg-accent text-navy-900" : "bg-neutral-50 text-slate-500"
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase">{day.short}</span>
                    <span className="mt-0.5 hidden text-xs sm:block">
                      {hours ? hoursLabel(hours.opens, hours.closes) : "Off"}
                    </span>
                    <span className="sr-only sm:hidden">
                      {hours ? hoursLabel(hours.opens, hours.closes) : "Off"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div>
              <WeekHoursEditor
                idPrefix={id}
                value={draft}
                onChange={(next) => {
                  setDraft(next);
                  changed();
                }}
                disabled={!canEdit || pending}
              />
              <p className="mt-2 text-sm text-slate-600">
                Bookings still need the shop to be open, so hours outside the shop&apos;s are
                ignored.
              </p>
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-sm ${problem ? "font-medium text-danger" : "text-slate-600"}`}>
            {problem ??
              (takesBookings
                ? `${member.name} gets bookings ${usesShopHours ? "whenever the shop is open" : "in their own hours"}.`
                : `${member.name} won't be given bookings.`)}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={save}
            disabled={pending || !!problem}
            className="shrink-0 motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
          >
            {pending ? "Saving…" : `Save ${member.name.split(/\s+/)[0]}'s schedule`}
          </Button>
        </div>
      )}
      <div className="px-4 empty:hidden">
        <FormMessage state={state} />
      </div>
    </article>
  );
}
