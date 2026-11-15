import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { trackBatchEventsAction, trackClientEventAction } from "@/features/analytics/actions";
import { db } from "@/lib/db";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"),
  }),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "user-123",
    platformRole: "customer",
    status: "active",
  }),
}));

describe("Analytics actions", () => {
  const shopId = randomUUID();
  const serviceId = randomUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a single client event into analytics_events", async () => {
    const insertSpy = vi.spyOn(db, "insert").mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    } as never);

    const result = await trackClientEventAction({
      eventName: "funnel_start",
      sessionId: "sess_client_999",
      shopId,
      serviceId,
      step: "select_service",
      metadata: { source: "mobile_web" },
    });

    expect(result.ok).toBe(true);
    expect(insertSpy).toHaveBeenCalled();
  });

  it("records batch of analytics events", async () => {
    const insertSpy = vi.spyOn(db, "insert").mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    } as never);

    const result = await trackBatchEventsAction({
      events: [
        {
          eventName: "shop_view",
          sessionId: "sess_batch_1",
          shopId,
          step: "view_shop",
        },
        {
          eventName: "slot_selected",
          sessionId: "sess_batch_1",
          shopId,
          serviceId,
          step: "select_slot",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.processed).toBe(2);
    }
    expect(insertSpy).toHaveBeenCalled();
  });
});
