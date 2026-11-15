import "server-only";

import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import type { AnalyticsEventName, FunnelStep } from "@/lib/db/schema/enums";

export type ServerTrackEventParams = {
  eventName: AnalyticsEventName;
  sessionId?: string;
  userId?: string | null;
  shopId?: string | null;
  serviceId?: string | null;
  bookingId?: string | null;
  step?: FunnelStep | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Persists an analytics event from the server.
 * Completely fail-safe: never throws, so customer flows are never interrupted.
 */
export async function trackServerEvent(params: ServerTrackEventParams): Promise<void> {
  try {
    const sessionId = params.sessionId || `srv_${crypto.randomUUID()}`;
    await db.insert(analyticsEvents).values({
      eventName: params.eventName,
      sessionId,
      userId: params.userId ?? null,
      shopId: params.shopId ?? null,
      serviceId: params.serviceId ?? null,
      bookingId: params.bookingId ?? null,
      step: params.step ?? null,
      metadata: params.metadata ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (error) {
    // Non-blocking log warning for telemetry observability
    console.warn("Failed to record server analytics event:", error);
  }
}
