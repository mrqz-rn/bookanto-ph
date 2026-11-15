import type { Metadata } from "next";

import { PilotMetricsDashboard } from "@/features/analytics/components/pilot-metrics-dashboard";
import { type AnalyticsPeriod } from "@/features/analytics/constants";
import { getCohortReport, getPilotMetrics } from "@/features/analytics/queries";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Pilot Metrics & Analytics | Admin Console | BooKanto",
  description:
    "Pilot launch KPIs, booking funnel conversion events, and customer cohort retention reports.",
};

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

const VALID_PERIODS: readonly AnalyticsPeriod[] = ["today", "7d", "30d", "90d", "pilot", "all"];

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  assertCan(user, "admin:analytics.read");

  const { period = "30d" } = await searchParams;
  const selectedPeriod: AnalyticsPeriod = VALID_PERIODS.includes(period as AnalyticsPeriod)
    ? (period as AnalyticsPeriod)
    : "30d";

  const [metrics, cohorts] = await Promise.all([
    getPilotMetrics({ period: selectedPeriod }),
    getCohortReport({ periodType: "monthly", periodsCount: 6 }),
  ]);

  return (
    <PilotMetricsDashboard metrics={metrics} cohorts={cohorts} currentPeriod={selectedPeriod} />
  );
}
