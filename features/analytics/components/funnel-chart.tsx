"use client";

import * as React from "react";
import { ArrowDown, Filter, TrendingDown } from "lucide-react";
import { cn } from "cn";

import type { BookingFunnelData } from "../constants";
import { EmptyChart, Panel, PanelHeader } from "./panel";

type FunnelChartProps = {
  data: BookingFunnelData;
  title?: string;
  description?: string;
};

export function FunnelChart({
  data,
  title = "Booking funnel",
  description = "How many customers reach each step, from opening a shop's page to a completed service.",
}: FunnelChartProps) {
  const headingId = React.useId();
  const steps = [...data.steps].sort((a, b) => a.order - b.order);
  const firstCount = steps[0]?.count ?? 0;
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  // Each step's dropOffRate is the share lost on the way into that step.
  const biggestDropIndex = steps.reduce(
    (best, step, index) =>
      index > 0 && step.dropOffRate > (steps[best]?.dropOffRate ?? 0) ? index : best,
    0,
  );
  const biggestDrop = biggestDropIndex > 0 ? steps[biggestDropIndex] : undefined;
  const biggestDropFrom = biggestDrop ? steps[biggestDropIndex - 1] : undefined;

  return (
    <Panel aria-labelledby={headingId}>
      <PanelHeader
        id={headingId}
        title={title}
        description={description}
        aside={
          <div className="sm:text-right">
            <p className="text-3xl font-semibold text-foreground">{data.overallConversionRate}%</p>
            <p className="text-sm text-muted-foreground">
              of shop views end in a completed service
            </p>
          </div>
        }
      />

      {firstCount === 0 ? (
        <EmptyChart icon={Filter} title="No funnel events in this period">
          Steps fill in as customers open shop pages and start booking.
        </EmptyChart>
      ) : (
        <>
          {biggestDrop && biggestDropFrom ? (
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-foreground">
              <TrendingDown className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-semibold">Biggest drop:</span> {biggestDrop.dropOffRate}% drop
                off between {biggestDropFrom.label.toLowerCase()} and{" "}
                {biggestDrop.label.toLowerCase()}.
              </span>
            </p>
          ) : null}

          <ol className="mt-5">
            {steps.map((step, index) => {
              const isBiggestDrop = index === biggestDropIndex && index > 0;
              return (
                <li key={step.step}>
                  {index > 0 ? (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 py-1.5 pl-2.5 text-xs",
                        isBiggestDrop ? "font-semibold text-warning" : "text-muted-foreground",
                      )}
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                      {step.dropOffRate}% drop off
                    </p>
                  ) : null}

                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[1.5rem_minmax(0,13rem)_minmax(0,1fr)_7rem]">
                    <span
                      className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground tabular-nums"
                      aria-hidden
                    >
                      {step.order}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      <span className="sr-only">Step {step.order}: </span>
                      {step.label}
                    </span>

                    {/* Bar: full row width under 640px, its own column above. */}
                    <div
                      className="col-span-3 col-start-1 row-start-2 h-2 rounded-r-[4px] bg-neutral-100 sm:col-span-1 sm:col-start-3 sm:row-start-1"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-r-[4px] bg-green-600"
                        style={{ width: `${Math.max(1, (step.count / maxCount) * 100)}%` }}
                      />
                    </div>

                    <p className="text-right text-sm tabular-nums sm:col-start-4">
                      <span className="font-semibold text-foreground">
                        {step.count.toLocaleString()}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {index === 0 ? "100" : step.conversionFromFirst}%
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Counts are tracked events at each step; the percentage is their share of shop views.
          </p>
        </>
      )}
    </Panel>
  );
}
