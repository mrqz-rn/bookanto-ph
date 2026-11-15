import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  analyticsFilterSchema,
  cohortFilterSchema,
  trackBatchEventsSchema,
  trackEventSchema,
} from "@/features/analytics/schema";

describe("Analytics schemas", () => {
  const validUuid = randomUUID();

  describe("trackEventSchema", () => {
    it("accepts valid booking funnel events", () => {
      const parsed = trackEventSchema.parse({
        eventName: "funnel_start",
        sessionId: "sess_123456",
        shopId: validUuid,
        serviceId: validUuid,
        step: "select_service",
        metadata: {
          serviceName: "Standard Haircut",
        },
      });

      expect(parsed.eventName).toBe("funnel_start");
      expect(parsed.sessionId).toBe("sess_123456");
      expect(parsed.step).toBe("select_service");
      expect(parsed.metadata?.serviceName).toBe("Standard Haircut");
    });

    it("accepts minimal shop_view event without service or booking", () => {
      const parsed = trackEventSchema.parse({
        eventName: "shop_view",
        sessionId: "sess_abc",
        shopId: validUuid,
        step: "view_shop",
      });

      expect(parsed.eventName).toBe("shop_view");
      expect(parsed.serviceId).toBeUndefined();
    });

    it("rejects unknown event name", () => {
      expect(() =>
        trackEventSchema.parse({
          eventName: "random_unknown_event",
          sessionId: "sess_123",
        }),
      ).toThrow();
    });

    it("rejects empty session ID", () => {
      expect(() =>
        trackEventSchema.parse({
          eventName: "funnel_start",
          sessionId: "",
        }),
      ).toThrow();
    });

    it("rejects invalid step name", () => {
      expect(() =>
        trackEventSchema.parse({
          eventName: "funnel_step",
          sessionId: "sess_123",
          step: "invalid_step_name",
        }),
      ).toThrow();
    });
  });

  describe("trackBatchEventsSchema", () => {
    it("accepts valid batch of events", () => {
      const parsed = trackBatchEventsSchema.parse({
        events: [
          {
            eventName: "shop_view",
            sessionId: "sess_1",
            shopId: validUuid,
            step: "view_shop",
          },
          {
            eventName: "funnel_start",
            sessionId: "sess_1",
            shopId: validUuid,
            serviceId: validUuid,
            step: "select_service",
          },
        ],
      });

      expect(parsed.events.length).toBe(2);
    });

    it("rejects empty batch of events", () => {
      expect(() =>
        trackBatchEventsSchema.parse({
          events: [],
        }),
      ).toThrow();
    });
  });

  describe("analyticsFilterSchema", () => {
    it("defaults to 30d period when omitted", () => {
      const parsed = analyticsFilterSchema.parse({});
      expect(parsed.period).toBe("30d");
    });

    it("accepts valid analytics periods", () => {
      expect(analyticsFilterSchema.parse({ period: "7d" }).period).toBe("7d");
      expect(analyticsFilterSchema.parse({ period: "pilot" }).period).toBe("pilot");
      expect(analyticsFilterSchema.parse({ period: "all" }).period).toBe("all");
    });

    it("rejects invalid period key", () => {
      expect(() =>
        analyticsFilterSchema.parse({
          period: "invalid_period",
        }),
      ).toThrow();
    });
  });

  describe("cohortFilterSchema", () => {
    it("defaults to monthly with 6 periods", () => {
      const parsed = cohortFilterSchema.parse({});
      expect(parsed.periodType).toBe("monthly");
      expect(parsed.periodsCount).toBe(6);
    });

    it("accepts weekly with custom periods count", () => {
      const parsed = cohortFilterSchema.parse({
        periodType: "weekly",
        periodsCount: 12,
      });
      expect(parsed.periodType).toBe("weekly");
      expect(parsed.periodsCount).toBe(12);
    });

    it("rejects periods count below 2", () => {
      expect(() =>
        cohortFilterSchema.parse({
          periodsCount: 1,
        }),
      ).toThrow();
    });
  });
});
