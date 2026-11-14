import { describe, expect, it } from "vitest";

import { nearbyShopsInput } from "@/features/search/schema";
import { coarsen, formatDistance, isInPhilippines } from "@/lib/geo";

describe("coarsen", () => {
  it("rounds to about a kilometer", () => {
    expect(coarsen(14.650_734)).toBe(14.65);
    expect(coarsen(121.102_9)).toBe(121.1);
  });
});

describe("formatDistance", () => {
  it("uses meters below a kilometer and trims .0", () => {
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(4)).toBe("10 m");
    expect(formatDistance(1_250)).toBe("1.3 km");
    expect(formatDistance(5_000)).toBe("5 km");
    expect(formatDistance(12_400)).toBe("12 km");
  });
});

describe("nearby search input", () => {
  it("accepts points in the Philippines only", () => {
    expect(isInPhilippines(14.65, 121.1)).toBe(true);
    expect(isInPhilippines(1.35, 103.82)).toBe(false); // Singapore
    expect(nearbyShopsInput.safeParse({ lat: 14.65, lng: 121.1 }).success).toBe(true);
    expect(nearbyShopsInput.safeParse({ lat: 1.35, lng: 103.82 }).success).toBe(false);
  });

  it("rejects extra fields and strings", () => {
    expect(nearbyShopsInput.safeParse({ lat: 14.65, lng: 121.1, radius: 1e6 }).success).toBe(false);
    expect(nearbyShopsInput.safeParse({ lat: "14.65", lng: "121.1" }).success).toBe(false);
  });
});
