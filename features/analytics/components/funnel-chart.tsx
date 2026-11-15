"use client";

import * as React from "react";
import {
  ArrowDown,
  CheckCircle2,
  ChevronRight,
  Eye,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import type { BookingFunnelData, FunnelStepMetric } from "../constants";

type FunnelChartProps = {
  data: BookingFunnelData;
  title?: string;
  description?: string;
};

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  view_shop: Eye,
  select_service: Sparkles,
  select_slot: ChevronRight,
  enter_details: Users,
  submit_booking: UserCheck,
  confirmed: CheckCircle2,
  completed: CheckCircle2,
};

export function FunnelChart({
  data,
  title = "Booking Funnel Conversion",
  description = "Customer journey from shop view to completed service",
}: FunnelChartProps) {
  const maxCount = Math.max(...data.steps.map((s) => s.count), 1);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-neutral-900 sm:text-xl">{title}</h2>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-right">
            <span className="block text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
              Overall Conversion
            </span>
            <span className="font-display text-lg font-bold text-emerald-900 sm:text-xl">
              {data.overallConversionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Funnel Steps Flow */}
      <div className="mt-6 space-y-3">
        {data.steps.map((step: FunnelStepMetric, index: number) => {
          const Icon = STEP_ICONS[step.step] || ChevronRight;
          const barWidthPercent = Math.max(8, Math.round((step.count / maxCount) * 100));
          const isFinal = index === data.steps.length - 1;

          return (
            <div key={step.step} className="group relative">
              <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/20 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-2xs">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">
                        {step.order}. {step.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {step.count.toLocaleString()} visits/events
                    </span>
                  </div>
                </div>

                {/* Progress bar & conversion stats */}
                <div className="flex flex-1 items-center gap-4 sm:max-w-md sm:justify-end">
                  <div className="hidden h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200 sm:block">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="block text-[10px] text-neutral-400">vs Previous</span>
                      <span className="text-xs font-bold text-neutral-800">
                        {index === 0 ? "100%" : `${step.conversionFromPrevious}%`}
                      </span>
                    </div>
                    <div className="w-16">
                      <span className="block text-[10px] text-neutral-400">Total Conv.</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {step.conversionFromFirst}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drop-off connector line */}
              {!isFinal && step.dropOffRate > 0 && (
                <div className="ml-7 flex items-center gap-2 py-1 text-[11px] text-rose-500">
                  <ArrowDown className="size-3 text-rose-400" />
                  <span className="font-medium">{step.dropOffRate}% drop-off to next step</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
