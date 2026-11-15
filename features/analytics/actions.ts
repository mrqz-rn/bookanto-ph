"use server";

import { headers } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import { parseInput, runAction, type ActionResult } from "@/lib/errors";

import {
  trackBatchEventsSchema,
  trackEventSchema,
  type TrackBatchEventsInput,
  type TrackEventInput,
} from "./schema";

/**
 * Server action to record a client-side analytics event.
 * Open to both authenticated users and anonymous guests (using client sessionId).
 */
export async function trackClientEventAction(
  input: TrackEventInput,
): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const data = parseInput(trackEventSchema, input);
    const user = await getCurrentUser();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    await db.insert(analyticsEvents).values({
      eventName: data.eventName,
      sessionId: data.sessionId,
      userId: user?.id ?? null,
      shopId: data.shopId ?? null,
      serviceId: data.serviceId ?? null,
      bookingId: data.bookingId ?? null,
      step: data.step ?? null,
      metadata: (data.metadata as Record<string, unknown>) ?? null,
      ip,
      userAgent,
    });

    return { success: true };
  });
}

/**
 * Server action to record a batch of client analytics events.
 */
export async function trackBatchEventsAction(
  input: TrackBatchEventsInput,
): Promise<ActionResult<{ processed: number }>> {
  return runAction(async () => {
    const data = parseInput(trackBatchEventsSchema, input);
    const user = await getCurrentUser();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    const values = data.events.map((e) => ({
      eventName: e.eventName,
      sessionId: e.sessionId,
      userId: user?.id ?? null,
      shopId: e.shopId ?? null,
      serviceId: e.serviceId ?? null,
      bookingId: e.bookingId ?? null,
      step: e.step ?? null,
      metadata: (e.metadata as Record<string, unknown>) ?? null,
      ip,
      userAgent,
    }));

    if (values.length > 0) {
      await db.insert(analyticsEvents).values(values);
    }

    return { processed: values.length };
  });
}
