"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { acceptBooking, completeBooking, markNoShow } from "../../actions";
import type { QueueEntry } from "../../customer-queries";

/**
 * Today's queue: confirm new numbers, then mark each one served or a
 * no-show. Numbers are served in order.
 */
export function QueueBoard({ entries }: { entries: QueueEntry[] }) {
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const waiting = entries.filter(
    (entry) => entry.status === "requested" || entry.status === "confirmed",
  );
  const done = entries.filter((entry) => !waiting.includes(entry));

  const run = (entry: QueueEntry, action: "confirm" | "done" | "no_show") => {
    setBusy(entry.id);
    startTransition(async () => {
      const input = { bookingId: entry.id };
      const result =
        action === "confirm"
          ? await acceptBooking(input)
          : action === "done"
            ? await completeBooking(input)
            : await markNoShow(input);
      setBusy(null);
      setMessage(
        result.ok
          ? {
              ok: true,
              text:
                action === "confirm"
                  ? `#${entry.queueNumber} confirmed.`
                  : action === "done"
                    ? `#${entry.queueNumber} served. Next!`
                    : `#${entry.queueNumber} marked as no-show.`,
            }
          : { ok: false, text: result.message },
      );
    });
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="font-semibold text-navy-900">No one in the queue today</p>
        <p className="mt-1 text-sm text-slate-600">
          Customers join from your shop page while you&apos;re open. Add walk-ins from the Walk-ins
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite">
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`rounded-md border px-3 py-2 text-sm ${
              message.ok
                ? "border-success/30 bg-accent text-green-800"
                : "border-danger/30 bg-red-50 text-danger"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      <section aria-labelledby="queue-waiting">
        <h2 id="queue-waiting" className="text-sm font-semibold text-navy-900">
          Waiting ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Everyone has been served.</p>
        ) : (
          <ol className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
            {waiting.map((entry, index) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 p-3">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold ${
                    index === 0 ? "bg-primary text-navy-900" : "bg-muted text-navy-900"
                  }`}
                  aria-label={`Number ${entry.queueNumber}`}
                >
                  {entry.queueNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">
                    {entry.name}
                    {entry.isWalkIn && (
                      <span className="font-normal text-slate-600"> · walk-in</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    {entry.serviceName} ·{" "}
                    {entry.status === "requested" ? "⏳ New, confirm it" : "✓ Confirmed"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.status === "requested" ? (
                    <Button
                      type="button"
                      onClick={() => run(entry, "confirm")}
                      disabled={busy === entry.id}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => run(entry, "done")}
                        disabled={busy === entry.id}
                      >
                        Served
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => run(entry, "no_show")}
                        disabled={busy === entry.id}
                      >
                        No-show
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="queue-done">
          <h2 id="queue-done" className="text-sm font-semibold text-navy-900">
            Done today ({done.length})
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {done.map((entry) => (
              <li
                key={entry.id}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm text-slate-600"
              >
                #{entry.queueNumber} {entry.name} ·{" "}
                {entry.status === "completed"
                  ? "served"
                  : entry.status === "no_show"
                    ? "no-show"
                    : entry.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
