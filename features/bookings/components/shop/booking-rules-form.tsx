"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, pesosToCentavos } from "@/lib/money";

import { setBookingRules } from "../../customer-actions";
import { amountDueOnline, type BookingRules } from "../../rules";

const label = "mb-1 block text-sm font-medium text-navy-900";
const select =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

const WINDOW_OPTIONS = [0, 1, 2, 3, 6, 12, 24, 48];
const QUOTE_OPTIONS = [6, 12, 24, 48, 72];

export function BookingRulesForm({
  shopId,
  rules,
  canEdit,
  paymentsReady,
}: {
  shopId: string;
  rules: BookingRules;
  canEdit: boolean;
  /** False until the platform has online payment set up. */
  paymentsReady: boolean;
}) {
  const [draft, setDraft] = React.useState(rules);
  const [fixedPesos, setFixedPesos] = React.useState(
    rules.depositType === "fixed" && rules.depositValue ? String(rules.depositValue / 100) : "",
  );
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const disabled = !canEdit || pending;

  const update = (patch: Partial<BookingRules>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
  };

  const fixedCentavos = (() => {
    try {
      return fixedPesos.trim() ? pesosToCentavos(fixedPesos) : 0;
    } catch {
      return -1;
    }
  })();
  const effective: BookingRules = {
    ...draft,
    depositValue: draft.depositType === "fixed" ? Math.max(fixedCentavos, 0) : draft.depositValue,
  };
  const example = amountDueOnline(effective, 50_000);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.paymentMode === "deposit" && draft.depositType === "fixed" && fixedCentavos < 0) {
      setMessage({ ok: false, text: "Enter the deposit like 200 or 200.50." });
      return;
    }
    startTransition(async () => {
      const result = await setBookingRules({ shopId, ...effective });
      setMessage(
        result.ok
          ? { ok: true, text: "Saved. New bookings follow these rules." }
          : {
              ok: false,
              text: Object.values(result.fieldErrors ?? {}).flat()[0] ?? result.message,
            },
      );
    });
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="font-display text-xl font-bold text-navy-900">
          Cancelling and moving
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rules-window" className={label}>
              Free cancellation until
            </label>
            <select
              id="rules-window"
              className={select}
              value={draft.cancelWindowHours}
              onChange={(event) => update({ cancelWindowHours: Number(event.target.value) })}
            >
              {WINDOW_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours === 0
                    ? "The start time"
                    : `${hours} ${hours === 1 ? "hour" : "hours"} before`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600">
              Later cancellations count as late on the customer&apos;s record, and any deposit is
              kept. Customers can&apos;t move a booking this close to its time.
            </p>
          </div>
          <div>
            <label htmlFor="rules-reschedules" className={label}>
              Times a customer can move a booking
            </label>
            <select
              id="rules-reschedules"
              className={select}
              value={draft.maxReschedules}
              onChange={(event) => update({ maxReschedules: Number(event.target.value) })}
            >
              {[0, 1, 2, 3, 5].map((count) => (
                <option key={count} value={count}>
                  {count === 0 ? "Not allowed" : count}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rules-quote" className={label}>
              Quotes are valid for
            </label>
            <select
              id="rules-quote"
              className={select}
              value={draft.quoteValidHours}
              onChange={(event) => update({ quoteValidHours: Number(event.target.value) })}
            >
              {QUOTE_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} hours
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled || !paymentsReady}>
        <legend className="font-display text-xl font-bold text-navy-900">Online payment</legend>
        {!paymentsReady && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-slate-600">
            Online payment through GCash, Maya and cards isn&apos;t switched on for BooKanto yet.
            Customers pay at the shop for now.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rules-payment" className={label}>
              After you confirm a booking, ask the customer to pay
            </label>
            <select
              id="rules-payment"
              className={select}
              value={draft.paymentMode}
              onChange={(event) =>
                update({ paymentMode: event.target.value as BookingRules["paymentMode"] })
              }
            >
              <option value="none">Nothing online (pay at the shop)</option>
              <option value="deposit">A deposit</option>
              <option value="full">The full price</option>
            </select>
          </div>
          {draft.paymentMode === "deposit" && (
            <div>
              <span className={label} id="rules-deposit-label">
                Deposit
              </span>
              <div className="flex gap-2" role="group" aria-labelledby="rules-deposit-label">
                <select
                  aria-label="Deposit type"
                  className={`${select} w-32`}
                  value={draft.depositType}
                  onChange={(event) =>
                    update({ depositType: event.target.value as BookingRules["depositType"] })
                  }
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Amount</option>
                </select>
                {draft.depositType === "percent" ? (
                  <Input
                    aria-label="Deposit percent"
                    type="number"
                    min={1}
                    max={100}
                    value={draft.depositValue || ""}
                    onChange={(event) => update({ depositValue: Number(event.target.value) })}
                    placeholder="20"
                  />
                ) : (
                  <Input
                    aria-label="Deposit in pesos"
                    inputMode="decimal"
                    value={fixedPesos}
                    onChange={(event) => {
                      setFixedPesos(event.target.value);
                      setMessage(null);
                    }}
                    placeholder="200"
                  />
                )}
              </div>
            </div>
          )}
        </div>
        {draft.paymentMode !== "none" && (
          <p className="text-sm text-slate-600">
            {example > 0
              ? `For a ₱500 booking, the customer pays ${formatPeso(example)} online.`
              : "Amounts under ₱20 aren't collected online."}{" "}
            Declined, expired, and on-time cancellations are refunded automatically.
          </p>
        )}
      </fieldset>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save rules"}
        </Button>
      ) : (
        <p className="text-sm text-slate-600">Only the owner or a manager can change these.</p>
      )}
      <div aria-live="polite">
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`text-sm ${message.ok ? "text-green-800" : "text-danger"}`}
          >
            {message.ok ? "✓ " : ""}
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
