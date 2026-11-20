"use client";

import * as React from "react";

import { Store, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { addClosure, addTimeOff, removeClosure, removeTimeOff } from "../actions";
import {
  DateTile,
  fieldLabel,
  FormMessage,
  Segmented,
  selectClass,
  SwitchField,
  type FormState,
} from "./panel";

export type ClosureItem = {
  id: string;
  kind: "closure" | "time_off";
  /** "Whole shop" or the staff member's name. */
  who: string;
  when: string;
  reason: string | null;
  /** The first day as a calendar tile ("NOV", "28"). */
  tile: { month: string; day: string };
};

type Props = {
  shopId: string;
  today: string;
  items: ClosureItem[];
  staff: Array<{ userId: string; name: string }>;
  /** Whole-shop closures (shop:update). */
  canEditShop: boolean;
  /** Staff time off (schedule:block). */
  canBlock: boolean;
};

const SHOP = "shop";

function heldMessage(count: number) {
  if (count === 0) return "";
  return count === 1
    ? " 1 booking falls in this time. Message that customer to move it."
    : ` ${count} bookings fall in this time. Message those customers to move them.`;
}

export function ClosuresPanel({ shopId, today, items, staff, canEditShop, canBlock }: Props) {
  const [who, setWho] = React.useState(canEditShop ? SHOP : (staff[0]?.userId ?? SHOP));
  const [lastPerson, setLastPerson] = React.useState(staff[0]?.userId ?? "");
  const [allDay, setAllDay] = React.useState(true);
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);
  const [startTime, setStartTime] = React.useState("12:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [reason, setReason] = React.useState("");
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [removing, setRemoving] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const canAdd = canEditShop || (canBlock && staff.length > 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const range = {
        shopId,
        startDate,
        endDate,
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        reason,
      };
      const result =
        who === SHOP ? await addClosure(range) : await addTimeOff({ ...range, userId: who });
      if (result.ok) {
        setReason("");
        setState({
          kind: "success",
          message: `${who === SHOP ? "Closure" : "Time off"} added.${heldMessage(result.data.heldBookings)}`,
        });
      } else {
        const fieldMessage = Object.values(result.fieldErrors ?? {}).flat()[0];
        setState({ kind: "error", message: fieldMessage ?? result.message });
      }
    });
  };

  const remove = (item: ClosureItem) => {
    setRemoving(item.id);
    startTransition(async () => {
      const result =
        item.kind === "closure"
          ? await removeClosure({ shopId, closureId: item.id })
          : await removeTimeOff({ shopId, timeOffId: item.id });
      setRemoving(null);
      setState(
        result.ok
          ? { kind: "success", message: `Removed: ${item.who}, ${item.when}.` }
          : { kind: "error", message: result.message },
      );
    });
  };

  const canRemove = (item: ClosureItem) => (item.kind === "closure" ? canEditShop : canBlock);

  const forShop = who === SHOP;
  const scopes = [
    ...(canEditShop ? [{ value: "shop" as const, label: "Close the shop" }] : []),
    ...(canBlock && staff.length > 0
      ? [{ value: "person" as const, label: "One person off" }]
      : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-navy-900">Coming up</h3>
        {items.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="font-semibold text-navy-900">No closures or time off planned</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
              Add one for a fiesta, a renovation or a day off, and customers can&apos;t book those
              times.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-3 sm:p-4">
                <DateTile month={item.tile.month} day={item.tile.day} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{item.when}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.kind === "closure"
                          ? "bg-navy-900 text-white"
                          : "bg-muted text-navy-900"
                      }`}
                    >
                      {item.kind === "closure" ? (
                        <Store aria-hidden="true" className="size-3" />
                      ) : (
                        <UserRound aria-hidden="true" className="size-3" />
                      )}
                      {item.who}
                    </span>
                    {item.reason && <span className="min-w-0 truncate">{item.reason}</span>}
                  </p>
                </div>
                {canRemove(item) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => remove(item)}
                    disabled={pending}
                    aria-label={`Remove ${item.who}, ${item.when}`}
                    className="shrink-0 rounded-full text-danger hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">
                      {removing === item.id ? "Removing…" : "Remove"}
                    </span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canAdd ? (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl bg-neutral-50 p-4 sm:p-5"
          aria-labelledby="add-closure-title"
        >
          <h3 id="add-closure-title" className="text-base font-semibold text-navy-900">
            Add a closure or time off
          </h3>

          {scopes.length > 1 && (
            <Segmented
              name="closure-scope"
              legend="Who is away"
              options={scopes}
              value={forShop ? "shop" : "person"}
              onChange={(scope) => setWho(scope === "shop" ? SHOP : lastPerson)}
            />
          )}

          {!forShop && (
            <div>
              <label htmlFor="closure-who" className={fieldLabel}>
                Who is off
              </label>
              <select
                id="closure-who"
                value={who}
                onChange={(event) => {
                  setWho(event.target.value);
                  setLastPerson(event.target.value);
                }}
                className={selectClass}
              >
                {staff.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <SwitchField id="closure-all-day" checked={allDay} onChange={setAllDay} label="All day" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="closure-start-date" className={fieldLabel}>
                From
              </label>
              <Input
                id="closure-start-date"
                type="date"
                min={today}
                required
                value={startDate}
                className="h-11"
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (event.target.value > endDate) setEndDate(event.target.value);
                }}
              />
            </div>
            <div>
              <label htmlFor="closure-end-date" className={fieldLabel}>
                Until
              </label>
              <Input
                id="closure-end-date"
                type="date"
                min={startDate}
                required
                value={endDate}
                className="h-11"
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            {!allDay && (
              <>
                <div>
                  <label htmlFor="closure-start-time" className={fieldLabel}>
                    From time
                  </label>
                  <Input
                    id="closure-start-time"
                    type="time"
                    step={300}
                    required
                    value={startTime}
                    className="h-11"
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="closure-end-time" className={fieldLabel}>
                    Until time
                  </label>
                  <Input
                    id="closure-end-time"
                    type="time"
                    step={300}
                    required
                    value={endTime}
                    className="h-11"
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label htmlFor="closure-reason" className={fieldLabel}>
              Reason <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <Input
              id="closure-reason"
              maxLength={200}
              placeholder="e.g. Barangay fiesta"
              value={reason}
              className="h-11"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
          >
            {pending && !removing ? "Adding…" : forShop ? "Add closure" : "Add time off"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-600">
          Only the owner or a manager can close the shop. Ask them to add time off for you.
        </p>
      )}

      <div className="lg:col-span-2">
        <FormMessage state={state} />
      </div>
    </div>
  );
}
