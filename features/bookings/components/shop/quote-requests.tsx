"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPeso, pesosToCentavos } from "@/lib/money";

import { sendQuote } from "../../customer-actions";
import type { QuoteRequest } from "../../customer-queries";

const label = "mb-1 block text-sm font-medium text-navy-900";

/** Quote requests: the job, the preferred time, and a form to name a price. */
export function QuoteRequests({
  requests,
  formatWhen,
}: {
  requests: QuoteRequest[];
  /** Server-formatted Manila times, by booking id. */
  formatWhen: Record<string, { start: string; expires: string | null }>;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="font-semibold text-navy-900">No quote requests right now</p>
        <p className="mt-1 text-sm text-slate-600">
          When a customer asks for a quote on a service, it shows up here for you to price.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id}>
          <QuoteCard request={request} when={formatWhen[request.id]!} />
        </li>
      ))}
    </ul>
  );
}

function QuoteCard({
  request,
  when,
}: {
  request: QuoteRequest;
  when: { start: string; expires: string | null };
}) {
  const [price, setPrice] = React.useState("");
  const [note, setNote] = React.useState("");
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const id = `quote-${request.id}`;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    let priceCentavos: number;
    try {
      priceCentavos = pesosToCentavos(price);
    } catch {
      setMessage({ ok: false, text: "Enter a price like 1500 or 1,500.50." });
      return;
    }
    startTransition(async () => {
      const result = await sendQuote({ bookingId: request.id, priceCentavos, note });
      setMessage(
        result.ok
          ? { ok: true, text: `Quote of ${formatPeso(priceCentavos)} sent.` }
          : { ok: false, text: result.message },
      );
    });
  };

  return (
    <article
      aria-labelledby={`${id}-title`}
      className="rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`${id}-title`} className="font-semibold text-navy-900">
            {request.serviceName} · {request.customerName}
          </h3>
          <p className="text-sm text-slate-600">
            Wants it on {when.start} · Ref {request.refCode}
          </p>
        </div>
        {request.status === "quoted" ? (
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-green-800">
            ✓ Quoted {formatPeso(request.quotedPriceCentavos ?? 0)}
          </span>
        ) : (
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-navy-900">
            ⏳ Needs a price
          </span>
        )}
      </div>

      {request.notes && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line text-navy-900">
          {request.notes}
        </p>
      )}

      {request.status === "quoted" ? (
        <p className="mt-3 text-sm text-slate-600">
          Waiting for the customer to accept{when.expires ? ` (until ${when.expires})` : ""}.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
        >
          <div>
            <label htmlFor={`${id}-price`} className={label}>
              Price (₱)
            </label>
            <Input
              id={`${id}-price`}
              inputMode="decimal"
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="1,500"
            />
          </div>
          <div>
            <label htmlFor={`${id}-note`} className={label}>
              Note <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <Textarea
              id={`${id}-note`}
              rows={1}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What's included"
            />
          </div>
          <Button type="submit" disabled={pending || !price.trim()}>
            {pending ? "Sending…" : "Send quote"}
          </Button>
          {when.expires && (
            <p className="text-xs text-slate-600 sm:col-span-3">
              Answer by {when.expires} or the request expires.
            </p>
          )}
        </form>
      )}

      <div aria-live="polite">
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`mt-3 text-sm ${message.ok ? "text-green-800" : "text-danger"}`}
          >
            {message.ok ? "✓ " : ""}
            {message.text}
          </p>
        )}
      </div>
    </article>
  );
}
