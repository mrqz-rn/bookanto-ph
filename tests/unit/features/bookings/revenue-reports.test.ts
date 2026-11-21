import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getShopRevenueStats } from "@/features/bookings/queries";
import { db } from "@/lib/db";

describe("getShopRevenueStats query", () => {
  const shopId = randomUUID();
  const staff1Id = randomUUID();
  const staff2Id = randomUUID();
  const service1Id = randomUUID();
  const service2Id = randomUUID();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates revenue, daily trend, top services, and staff performance", async () => {
    const mockBookings = [
      {
        id: randomUUID(),
        status: "completed",
        startAt: new Date("2026-11-14T02:00:00Z"),
        totalCentavos: 50000,
        isWalkIn: false,
        serviceId: service1Id,
        serviceName: "Signature Cut",
        staffId: staff1Id,
        staffName: "Kuya Bert",
      },
      {
        id: randomUUID(),
        status: "completed",
        startAt: new Date("2026-11-14T04:00:00Z"),
        totalCentavos: 30000,
        isWalkIn: true,
        serviceId: service2Id,
        serviceName: "Clean Shave",
        staffId: staff1Id,
        staffName: "Kuya Bert",
      },
      {
        id: randomUUID(),
        status: "completed",
        startAt: new Date("2026-11-15T03:00:00Z"),
        totalCentavos: 50000,
        isWalkIn: false,
        serviceId: service1Id,
        serviceName: "Signature Cut",
        staffId: staff2Id,
        staffName: "Ate Lisa",
      },
      {
        id: randomUUID(),
        status: "no_show",
        startAt: new Date("2026-11-15T06:00:00Z"),
        totalCentavos: 30000,
        isWalkIn: false,
        serviceId: service2Id,
        serviceName: "Clean Shave",
        staffId: staff2Id,
        staffName: "Ate Lisa",
      },
    ];

    vi.spyOn(db, "$with").mockReturnValue({
      as: vi.fn().mockReturnValue({}),
    } as never);

    vi.spyOn(db, "with").mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockBookings),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const stats = await getShopRevenueStats(shopId, "30d");

    expect(stats.period).toBe("30d");
    expect(stats.periodLabel).toBe("Last 30 Days");
    expect(stats.totalBookings).toBe(4);
    expect(stats.completedCount).toBe(3);
    expect(stats.grossCentavos).toBe(130000); // 50000 + 30000 + 50000
    expect(stats.averageCentavos).toBe(Math.round(130000 / 3));
    expect(stats.completionRate).toBe(75); // 3 of 4 = 75%
    expect(stats.noShowRate).toBe(25); // 1 of 4 = 25%
    expect(stats.walkInRate).toBe(25); // 1 of 4 = 25%

    // Top services breakdown
    expect(stats.topServices).toHaveLength(2);
    expect(stats.topServices[0]?.serviceName).toBe("Signature Cut");
    expect(stats.topServices[0]?.grossCentavos).toBe(100000);
    expect(stats.topServices[0]?.bookingsCount).toBe(2);
    expect(stats.topServices[0]?.sharePercentage).toBe(Math.round((100000 / 130000) * 100));

    expect(stats.topServices[1]?.serviceName).toBe("Clean Shave");
    expect(stats.topServices[1]?.grossCentavos).toBe(30000);
    expect(stats.topServices[1]?.bookingsCount).toBe(1);

    // Staff performance
    expect(stats.staffPerformance).toHaveLength(2);
    const bert = stats.staffPerformance.find((s) => s.staffId === staff1Id);
    expect(bert).toBeDefined();
    expect(bert?.assignedCount).toBe(2);
    expect(bert?.completedCount).toBe(2);
    expect(bert?.grossCentavos).toBe(80000);

    const lisa = stats.staffPerformance.find((s) => s.staffId === staff2Id);
    expect(lisa).toBeDefined();
    expect(lisa?.assignedCount).toBe(2);
    expect(lisa?.completedCount).toBe(1);
    expect(lisa?.grossCentavos).toBe(50000);

    // Daily trend
    expect(stats.dailyTrend.length).toBeGreaterThanOrEqual(1);
  });

  it("handles zero bookings gracefully without dividing by zero", async () => {
    vi.spyOn(db, "$with").mockReturnValue({
      as: vi.fn().mockReturnValue({}),
    } as never);

    vi.spyOn(db, "with").mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const stats = await getShopRevenueStats(shopId, "today");

    expect(stats.period).toBe("today");
    expect(stats.periodLabel).toBe("Today");
    expect(stats.totalBookings).toBe(0);
    expect(stats.completedCount).toBe(0);
    expect(stats.grossCentavos).toBe(0);
    expect(stats.averageCentavos).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.noShowRate).toBe(0);
    expect(stats.walkInRate).toBe(0);
    expect(stats.topServices).toEqual([]);
    expect(stats.staffPerformance).toEqual([]);
    expect(stats.dailyTrend).toEqual([]);
  });
});
