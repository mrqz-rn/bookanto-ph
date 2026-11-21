import type { Metadata } from "next";

import { MetricsDashboard } from "@/features/analytics/components/metrics-dashboard";
import { PILOT_WINDOW, type MetricsRange } from "@/features/analytics/constants";
import { getCohortReport, getPilotMetrics } from "@/features/analytics/queries";
import { metricsRangeSchema } from "@/features/analytics/schema";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { manilaDate, manilaToUtc } from "@/lib/time";

export const metadata: Metadata = {
  title: "Metrics | Admin Console | BooKanto",
  description:
    "Pilot targets, bookings and revenue, the booking funnel and customer retention, for the pilot or any date range.",
};

type PageProps = {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  assertCan(user, "admin:analytics.read");

  // No dates, or dates that don't parse, show the whole pilot.
  const { from, to } = await searchParams;
  const asked = from !== undefined || to !== undefined;
  const parsed = metricsRangeSchema.safeParse({ from, to });
  const range: MetricsRange = parsed.success
    ? { kind: "custom", ...parsed.data }
    : { kind: "pilot", ...PILOT_WINDOW };

  const [metrics, cohorts] = await Promise.all([
    getPilotMetrics({
      startDate: manilaToUtc(range.from),
      endDate: manilaToUtc(range.to, "23:59:59.999"),
    }),
    getCohortReport({ periodType: "monthly", periodsCount: 6 }),
  ]);

  return (
    <MetricsDashboard
      metrics={metrics}
      cohorts={cohorts}
      range={range}
      today={manilaDate(new Date())}
      invalidRange={asked && !parsed.success}
    />
  );
}
