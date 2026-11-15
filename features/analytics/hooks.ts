"use client";

import * as React from "react";

import type { AnalyticsEventName, FunnelStep } from "@/lib/db/schema/enums";
import { trackClientEvent } from "./tracker";

type UseBookingFunnelTrackerOptions = {
  shopId?: string | null;
  serviceId?: string | null;
  initialStep?: FunnelStep;
  serviceName?: string;
};

export function useBookingFunnelTracker({
  shopId,
  serviceId,
  initialStep = "select_service",
  serviceName,
}: UseBookingFunnelTrackerOptions) {
  const hasTrackedStart = React.useRef(false);

  // Track initial funnel start on mount
  React.useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      trackClientEvent({
        eventName: "funnel_start",
        shopId,
        serviceId,
        step: initialStep,
        metadata: { serviceName },
      });
    }
  }, [shopId, serviceId, initialStep, serviceName]);

  const trackStep = React.useCallback(
    (
      step: FunnelStep,
      eventName: AnalyticsEventName = "funnel_step",
      metadata?: Record<string, unknown>,
    ) => {
      trackClientEvent({
        eventName,
        shopId,
        serviceId,
        step,
        metadata: {
          ...metadata,
          serviceName,
        },
      });
    },
    [shopId, serviceId, serviceName],
  );

  return { trackStep };
}
