import { describe, expect, it } from "vitest";

import {
  DEFAULT_QUICK_REPLIES,
  MAX_QUICK_REPLY_BODY_LENGTH,
  MAX_QUICK_REPLY_TITLE_LENGTH,
} from "@/features/messages/constants";

describe("quick replies constants and configuration", () => {
  it("defines standard Philippine service shop quick replies", () => {
    const titles = DEFAULT_QUICK_REPLIES.map((r) => r.title);
    expect(titles).toContain("Confirm Booking");
    expect(titles).toContain("On the Way");
    expect(titles).toContain("Arrive 10m Early");
    expect(titles).toContain("Request Photo / Info");
    expect(titles).toContain("Running a Bit Late");
    expect(titles).toContain("Payment Methods");
    expect(titles).toContain("Thank You & Review");
  });

  it("ensures every default quick reply adheres to length bounds", () => {
    for (const reply of DEFAULT_QUICK_REPLIES) {
      expect(reply.title.length).toBeGreaterThan(0);
      expect(reply.title.length).toBeLessThanOrEqual(MAX_QUICK_REPLY_TITLE_LENGTH);
      expect(reply.body.length).toBeGreaterThan(0);
      expect(reply.body.length).toBeLessThanOrEqual(MAX_QUICK_REPLY_BODY_LENGTH);
      expect(reply.category).toBeDefined();
    }
  });

  it("includes Filipino localized context in arrival and payment replies", () => {
    const onTheWay = DEFAULT_QUICK_REPLIES.find((r) => r.id === "qr-on-the-way");
    expect(onTheWay?.body).toContain("gate pass");

    const payment = DEFAULT_QUICK_REPLIES.find((r) => r.id === "qr-payment");
    expect(payment?.body).toContain("GCash");
    expect(payment?.body).toContain("Maya");
  });
});
