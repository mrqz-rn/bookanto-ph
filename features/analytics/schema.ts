import { z } from "zod";

import { ANALYTICS_EVENT_NAMES, FUNNEL_STEPS } from "@/lib/db/schema/enums";

export const trackEventSchema = z.strictObject({
  eventName: z.enum(ANALYTICS_EVENT_NAMES),
  sessionId: z.string().min(1).max(128),
  shopId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  step: z.enum(FUNNEL_STEPS).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;

export const trackBatchEventsSchema = z.strictObject({
  events: z.array(trackEventSchema).min(1).max(50),
});

export type TrackBatchEventsInput = z.infer<typeof trackBatchEventsSchema>;

export const analyticsFilterSchema = z.strictObject({
  shopId: z.string().uuid().optional(),
  period: z.enum(["today", "7d", "30d", "90d", "pilot", "all"]).default("30d"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;

export const cohortFilterSchema = z.strictObject({
  shopId: z.string().uuid().optional(),
  periodType: z.enum(["monthly", "weekly"]).default("monthly"),
  periodsCount: z.number().int().min(2).max(24).default(6),
});

export type CohortFilterInput = z.infer<typeof cohortFilterSchema>;
