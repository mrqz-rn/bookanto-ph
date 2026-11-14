"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { addClosure, addTimeOff, removeClosure, removeTimeOff } from "../actions";
import { CheckField, fieldLabel, FormMessage, selectClass, type FormState } from "./panel";

export type ClosureItem = {
  id: string;
  kind: "closure" | "time_off";
  /** "Whole shop" or the staff member's name. */
  who: string;
  when: string;
  reason: string | null;
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">Coming up</h3>
        {items.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="font-medium text-navy-900">No closures or time off planned</p>
            <p className="mt-1 text-sm text-slate-600">
              Add one for a fiesta, renovation, or a day off, and customers won&apos;t be able to
              book those times.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{item.when}</p>
                  <p className="text-sm text-slate-600">
                    {item.who}
                    {item.reason && <> · {item.reason}</>}
                  </p>
                </div>
                {canRemove(item) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => remove(item)}
                    disabled={pending}
                    aria-label={`Remove ${item.who}, ${item.when}`}
                    className="shrink-0 text-danger hover:bg-red-50 hover:text-danger"
                  >
                    {removing === item.id ? "Removing…" : "Remove"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canAdd ? (
        <form onSubmit={submit} className="space-y-3" aria-labelledby="add-closure-title">
          <h3 id="add-closure-title" className="text-sm font-semibold text-navy-900">
            Add a closure or time off
          </h3>
          <div>
            <label htmlFor="closure-who" className={fieldLabel}>
              Who
            </label>
            <select
              id="closure-who"
              value={who}
              onChange={(event) => setWho(event.target.value)}
              className={selectClass}
            >
              {canEditShop && <option value={SHOP}>Whole shop (closed)</option>}
              {canBlock &&
                staff.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} (time off)
                  </option>
                ))}
            </select>
          </div>

          <CheckField id="closure-all-day" checked={allDay} onChange={setAllDay} label="All day" />

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
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending && !removing ? "Adding…" : "Add"}
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
