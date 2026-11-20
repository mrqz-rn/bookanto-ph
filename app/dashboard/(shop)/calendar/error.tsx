"use client";

import { Button } from "@/components/ui/button";

export default function CalendarError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-lg rounded-2xl border border-danger/30 bg-card p-8 text-center"
    >
      <h1 className="font-display text-2xl font-bold text-navy-900">
        We couldn&apos;t load your calendar
      </h1>
      <p className="mt-2 text-slate-600">
        Your bookings are safe. Try again; if it keeps happening, check Today or the inbox while we
        sort it out.
      </p>
      <Button onClick={reset} className="mt-5">
        Try again
      </Button>
    </div>
  );
}
