import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { db, type DbExecutor } from "@/lib/db";
import { bookings, fraudSignals, reports, reviews, shops, users } from "@/lib/db/schema";
import type { FraudSeverity, FraudSignalType } from "@/lib/db/schema/enums";

export type DetectedSignal = {
  targetType: "user" | "shop" | "booking";
  targetId: string;
  signalType: FraudSignalType;
  severity: FraudSeverity;
  score: number;
  details: Record<string, unknown>;
};

/**
 * Scans recent platform activity to detect abuse and fraud patterns:
 * 1. Excessive customer cancellations
 * 2. Frequent no-shows
 * 3. Burst booking velocity
 * 4. Shops with high dispute or report volume
 */
export async function scanForFraudSignals(executor: DbExecutor = db): Promise<{
  scanned: number;
  newSignals: number;
  updatedSignals: number;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const detected: DetectedSignal[] = [];

  // 1. Detect users with excessive cancellations (> 3 in last 30 days)
  const userCancellations = await executor
    .select({
      customerId: bookings.customerId,
      cancelledCount: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(and(eq(bookings.status, "cancelled"), gte(bookings.createdAt, thirtyDaysAgo)))
    .groupBy(bookings.customerId)
    .having(sql`count(*) >= 3`);

  for (const row of userCancellations) {
    if (!row.customerId) continue;
    const severity: FraudSeverity = row.cancelledCount >= 6 ? "high" : "medium";
    const score = Math.min(100, 40 + row.cancelledCount * 10);
    detected.push({
      targetType: "user",
      targetId: row.customerId,
      signalType: "excessive_cancellations",
      severity,
      score,
      details: {
        cancelledBookingsCount: row.cancelledCount,
        periodDays: 30,
        detectedAt: new Date().toISOString(),
      },
    });
  }

  // 2. Detect users with repeated no-shows (>= 2 in last 30 days)
  const userNoShows = await executor
    .select({
      customerId: bookings.customerId,
      noShowCount: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(and(eq(bookings.status, "no_show"), gte(bookings.createdAt, thirtyDaysAgo)))
    .groupBy(bookings.customerId)
    .having(sql`count(*) >= 2`);

  for (const row of userNoShows) {
    if (!row.customerId) continue;
    const severity: FraudSeverity = row.noShowCount >= 4 ? "critical" : "high";
    const score = Math.min(100, 50 + row.noShowCount * 15);
    detected.push({
      targetType: "user",
      targetId: row.customerId,
      signalType: "excessive_no_shows",
      severity,
      score,
      details: {
        noShowCount: row.noShowCount,
        periodDays: 30,
        detectedAt: new Date().toISOString(),
      },
    });
  }

  // 3. Detect burst booking velocity (>= 5 bookings within 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const velocitySpikes = await executor
    .select({
      customerId: bookings.customerId,
      burstCount: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(gte(bookings.createdAt, oneHourAgo))
    .groupBy(bookings.customerId)
    .having(sql`count(*) >= 5`);

  for (const row of velocitySpikes) {
    if (!row.customerId) continue;
    const severity: FraudSeverity = row.burstCount >= 8 ? "critical" : "high";
    const score = Math.min(100, 60 + row.burstCount * 5);
    detected.push({
      targetType: "user",
      targetId: row.customerId,
      signalType: "burst_bookings",
      severity,
      score,
      details: {
        bookingsInOneHour: row.burstCount,
        detectedAt: new Date().toISOString(),
      },
    });
  }

  // 4. Detect shops with high open report/dispute rate (>= 3 open reports)
  const reportedShops = await executor
    .select({
      shopId: reviews.shopId,
      reportCount: sql<number>`count(*)::int`,
    })
    .from(reports)
    .innerJoin(reviews, eq(reports.reviewId, reviews.id))
    .where(eq(reports.status, "open"))
    .groupBy(reviews.shopId)
    .having(sql`count(*) >= 2`);

  for (const row of reportedShops) {
    if (!row.shopId) continue;
    const severity: FraudSeverity = row.reportCount >= 4 ? "critical" : "medium";
    const score = Math.min(100, 45 + row.reportCount * 12);
    detected.push({
      targetType: "shop",
      targetId: row.shopId,
      signalType: "dispute_rate_high",
      severity,
      score,
      details: {
        openReviewReports: row.reportCount,
        detectedAt: new Date().toISOString(),
      },
    });
  }

  let newSignals = 0;
  let updatedSignals = 0;

  for (const sig of detected) {
    const [existing] = await executor
      .select({ id: fraudSignals.id })
      .from(fraudSignals)
      .where(
        and(
          eq(fraudSignals.targetType, sig.targetType),
          eq(fraudSignals.targetId, sig.targetId),
          eq(fraudSignals.signalType, sig.signalType),
          eq(fraudSignals.status, "active"),
        ),
      )
      .limit(1);

    if (existing) {
      await executor
        .update(fraudSignals)
        .set({
          severity: sig.severity,
          score: sig.score,
          details: sig.details,
          updatedAt: new Date(),
        })
        .where(eq(fraudSignals.id, existing.id));
      updatedSignals++;
    } else {
      await executor.insert(fraudSignals).values({
        targetType: sig.targetType,
        targetId: sig.targetId,
        signalType: sig.signalType,
        severity: sig.severity,
        status: "active",
        score: sig.score,
        details: sig.details,
      });
      newSignals++;
    }
  }

  return {
    scanned: detected.length,
    newSignals,
    updatedSignals,
  };
}
