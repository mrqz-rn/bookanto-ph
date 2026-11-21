"use client";

import { ChartColumn } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AnalyticsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Metrics</h1>
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-2xs">
        <ChartColumn className="size-6 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">
            The metrics didn&apos;t load
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            The database may be busy. Try again; if it keeps failing, wait a few minutes and reload.
          </p>
        </div>
        <Button onClick={reset}>Load the metrics again</Button>
      </div>
    </div>
  );
}
