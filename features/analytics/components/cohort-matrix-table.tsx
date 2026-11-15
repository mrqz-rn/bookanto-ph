"use client";

import * as React from "react";
import { TrendingUp, Users } from "lucide-react";

import { formatPeso } from "@/lib/money";
import type { CohortReportData, CustomerCohort } from "../constants";

type CohortMatrixTableProps = {
  data: CohortReportData;
  title?: string;
  description?: string;
};

function getRetentionShading(rate: number): string {
  if (rate === 0) return "bg-neutral-50 text-neutral-400";
  if (rate < 15) return "bg-emerald-50 text-emerald-800";
  if (rate < 30) return "bg-emerald-100 text-emerald-900 font-medium";
  if (rate < 50) return "bg-emerald-200 text-emerald-950 font-semibold";
  return "bg-emerald-600 text-white font-bold";
}

export function CohortMatrixTable({
  data,
  title = "Customer Cohort Retention",
  description = "Percentage of acquired customers who returned to book services over subsequent periods",
}: CohortMatrixTableProps) {
  const periodPrefix = data.periodType === "weekly" ? "W" : "M";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs sm:p-6">
      {/* Header & Cohort Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-neutral-900 sm:text-xl">{title}</h2>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>

        {/* Quick Summary Badges */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-center sm:text-left">
            <span className="block text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Avg M1 Retention
            </span>
            <span className="font-display text-base font-bold text-emerald-700 sm:text-lg">
              {data.summary.averageM1Retention}%
            </span>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-center sm:text-left">
            <span className="block text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Overall Avg LTV
            </span>
            <span className="font-display text-base font-bold text-neutral-900 sm:text-lg">
              {formatPeso(data.summary.overallAverageLtvCentavos)}
            </span>
          </div>
        </div>
      </div>

      {data.cohorts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-12 text-center">
          <Users className="size-8 text-neutral-400" />
          <h3 className="mt-2 text-sm font-semibold text-neutral-900">No Cohort History Yet</h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            As new customers book appointments across weeks and months, retention cohorts will
            automatically generate here.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase">
                <th className="py-2.5 pr-4">Cohort</th>
                <th className="px-3 py-2.5 text-center">Customers</th>
                <th className="px-3 py-2.5 text-right">Total GMV</th>
                <th className="px-3 py-2.5 text-right">Avg LTV</th>
                {Array.from({ length: data.maxPeriods }).map((_, idx) => (
                  <th key={idx} className="px-2 py-2.5 text-center">
                    {periodPrefix}
                    {idx}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.cohorts.map((cohort: CustomerCohort) => (
                <tr key={cohort.cohortKey} className="hover:bg-neutral-50/50">
                  <td className="py-3 pr-4 font-bold text-neutral-900">{cohort.cohortLabel}</td>
                  <td className="px-3 py-3 text-center font-medium text-neutral-700">
                    {cohort.cohortSize.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-neutral-700">
                    {formatPeso(cohort.totalSpendCentavos)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-800">
                    {formatPeso(cohort.cumulativeLtvCentavos)}
                  </td>

                  {/* Retention cells across periods */}
                  {Array.from({ length: data.maxPeriods }).map((_, pIdx) => {
                    const activity = cohort.retentionPeriods.find((p) => p.periodIndex === pIdx);
                    if (!activity) {
                      return (
                        <td key={pIdx} className="px-1 py-1 text-center">
                          <span className="block rounded-lg py-1.5 text-[11px] text-neutral-300">
                            -
                          </span>
                        </td>
                      );
                    }

                    const shadingClass = getRetentionShading(activity.retentionRate);

                    return (
                      <td key={pIdx} className="px-1 py-1 text-center">
                        <div
                          className={`rounded-lg py-1.5 transition-colors ${shadingClass}`}
                          title={`${activity.activeUsers} active customer(s) • ${formatPeso(activity.spendCentavos)}`}
                        >
                          <span className="text-[11px]">{activity.retentionRate}%</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5 text-neutral-400" />
          <span>Heatmap shows customer retention percentage per subsequent period</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase">Legend:</span>
          <div className="flex items-center gap-1">
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
              0%
            </span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800">
              &lt;15%
            </span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-900">
              15-30%
            </span>
            <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] text-emerald-950">
              30-50%
            </span>
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              50%+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
