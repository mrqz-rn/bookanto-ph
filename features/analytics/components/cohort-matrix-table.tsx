"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { cn } from "cn";

import { formatPeso } from "@/lib/money";

import type { CohortReportData } from "../constants";
import { EmptyChart, Panel, PanelHeader } from "./panel";

type CohortMatrixTableProps = {
  data: CohortReportData;
  title?: string;
  description?: string;
};

// One hue, light to dark. Dark steps take white text, light steps navy.
const RETENTION_BINS = [
  { label: "0%", test: (r: number) => r === 0, cell: "bg-neutral-50 text-muted-foreground" },
  { label: "Under 15%", test: (r: number) => r < 15, cell: "bg-green-50 text-foreground" },
  { label: "15–30%", test: (r: number) => r < 30, cell: "bg-green-100 text-foreground" },
  { label: "30–50%", test: (r: number) => r < 50, cell: "bg-green-300 text-foreground" },
  { label: "50% and up", test: () => true, cell: "bg-green-700 font-semibold text-white" },
] as const;

function retentionCell(rate: number): string {
  return (RETENTION_BINS.find((bin) => bin.test(rate)) ?? RETENTION_BINS[4]).cell;
}

export function CohortMatrixTable({
  data,
  title = "Customer retention",
  description = "Of the customers who first booked in each month, the share who booked again in the months after.",
}: CohortMatrixTableProps) {
  const headingId = React.useId();
  const prefix = data.periodType === "weekly" ? "W" : "M";
  const periodWord = data.periodType === "weekly" ? "week" : "month";

  const summary = [
    { label: "Customers tracked", value: data.summary.totalTrackedCustomers.toLocaleString() },
    { label: `Back in ${prefix}1`, value: `${data.summary.averageM1Retention}%` },
    { label: `Back in ${prefix}2`, value: `${data.summary.averageM2Retention}%` },
    { label: `Back in ${prefix}3`, value: `${data.summary.averageM3Retention}%` },
    { label: "Average lifetime value", value: formatPeso(data.summary.overallAverageLtvCentavos) },
  ];

  return (
    <Panel aria-labelledby={headingId}>
      <PanelHeader id={headingId} title={title} description={description} />

      {data.cohorts.length === 0 ? (
        <EmptyChart icon={Users} title="No cohort history yet">
          Cohorts appear once customers have booked across at least one {periodWord}.
        </EmptyChart>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            {summary.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="-mx-5 mt-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[42rem] border-separate border-spacing-[2px] text-left text-sm">
              <caption className="sr-only">
                Retention by first-booking {periodWord}. {prefix}0 is the first {periodWord}.
              </caption>
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="sticky left-0 bg-card py-2 pr-4 font-medium">
                    First booked
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Customers
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Revenue
                  </th>
                  <th scope="col" className="px-2 py-2 pr-4 text-right font-medium">
                    Lifetime value
                  </th>
                  {Array.from({ length: data.maxPeriods }, (_, i) => (
                    <th key={i} scope="col" className="w-14 py-2 text-center font-medium">
                      {prefix}
                      {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.cohorts.map((cohort) => (
                  <tr key={cohort.cohortKey}>
                    <th
                      scope="row"
                      className="sticky left-0 bg-card py-1.5 pr-4 font-medium whitespace-nowrap text-foreground"
                    >
                      {cohort.cohortLabel}
                    </th>
                    <td className="px-2 py-1.5 text-right text-foreground">
                      {cohort.cohortSize.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                      {formatPeso(cohort.totalSpendCentavos)}
                    </td>
                    <td className="px-2 py-1.5 pr-4 text-right text-muted-foreground">
                      {formatPeso(cohort.cumulativeLtvCentavos)}
                    </td>
                    {Array.from({ length: data.maxPeriods }, (_, i) => {
                      const activity = cohort.retentionPeriods.find((p) => p.periodIndex === i);
                      if (!activity) {
                        return (
                          <td key={i} className="text-center text-muted-foreground">
                            <span aria-hidden>·</span>
                            <span className="sr-only">Not reached yet</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={i}
                          className={cn(
                            "rounded-[4px] py-1.5 text-center text-xs",
                            retentionCell(activity.retentionRate),
                          )}
                          title={`${activity.activeUsers.toLocaleString()} customers · ${formatPeso(activity.spendCentavos)}`}
                        >
                          {activity.retentionRate}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Share who booked again:</span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {RETENTION_BINS.map((bin) => (
                <li key={bin.label} className="flex items-center gap-1.5">
                  <span
                    className={cn("size-3 rounded-[3px] ring-1 ring-border ring-inset", bin.cell)}
                    aria-hidden
                  />
                  {bin.label}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Panel>
  );
}
