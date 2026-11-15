"use client";

import type { AnalyticsEventName, FunnelStep } from "@/lib/db/schema/enums";

const SESSION_KEY = "bk_analytics_session_id";

/**
 * Returns a persistent anonymous session ID stored in sessionStorage,
 * falling back to localStorage if available, or a transient UUID.
 */
export function getClientSessionId(): string {
  if (typeof window === "undefined") {
    return "srv_unknown";
  }

  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.localStorage.getItem(SESSION_KEY);
    }
    if (!id) {
      id = `sess_${crypto.randomUUID().replaceAll("-", "")}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "sess_fallback";
  }
}

export type ClientTrackEventOptions = {
  eventName: AnalyticsEventName;
  shopId?: string | null;
  serviceId?: string | null;
  bookingId?: string | null;
  step?: FunnelStep | null;
  metadata?: Record<string, unknown>;
  useBeacon?: boolean;
};

/**
 * Dispatches an analytics funnel event to the server route handler.
 */
export function trackClientEvent(options: ClientTrackEventOptions): void {
  if (typeof window === "undefined") return;

  const sessionId = getClientSessionId();
  const payload = {
    eventName: options.eventName,
    sessionId,
    shopId: options.shopId ?? null,
    serviceId: options.serviceId ?? null,
    bookingId: options.bookingId ?? null,
    step: options.step ?? null,
    metadata: {
      ...options.metadata,
      referrer: document.referrer || null,
      path: window.location.pathname,
      screen: `${window.innerWidth}x${window.innerHeight}`,
    },
  };

  const body = JSON.stringify(payload);

  if (options.useBeacon && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/events", blob);
    return;
  }

  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Fail-safe: silently handle network/analytics dispatch failures
  });
}
