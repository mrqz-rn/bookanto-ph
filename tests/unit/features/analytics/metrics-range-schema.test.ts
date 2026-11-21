import { describe, expect, it } from "vitest";

import { metricsRangeSchema } from "@/features/analytics/schema";

describe("metricsRangeSchema", () => {
  it("accepts a range of real dates in order", () => {
    expect(metricsRangeSchema.parse({ from: "2026-10-01", to: "2026-11-21" })).toEqual({
      from: "2026-10-01",
      to: "2026-11-21",
    });
    expect(metricsRangeSchema.safeParse({ from: "2026-11-21", to: "2026-11-21" }).success).toBe(
      true,
    );
  });

  it("rejects an end date before the start", () => {
    const result = metricsRangeSchema.safeParse({ from: "2026-11-21", to: "2026-10-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["to"]);
  });

  it("rejects missing, repeated or impossible dates", () => {
    for (const input of [
      {},
      { from: "2026-10-01" },
      { from: ["2026-10-01", "2026-10-02"], to: "2026-11-21" },
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2026-10-01", to: "2026-11-21", extra: "1" },
    ]) {
      expect(metricsRangeSchema.safeParse(input).success).toBe(false);
    }
  });
});
