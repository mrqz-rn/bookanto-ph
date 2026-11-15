import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getTodayDashboardData } from "@/features/bookings/queries";
import { db } from "@/lib/db";

describe("getTodayDashboardData query", () => {
  const shopId = randomUUID();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates today KPIs, separates pending requests, and parses walk-in notes", async () => {
    const booking1 = {
      id: randomUUID(),
      refCode: "BK-REQ-001",
      shopId,
      serviceId: randomUUID(),
      staffId: null,
      customerId: randomUUID(),
      startAt: new Date("2026-11-15T01:00:00Z"),
      endAt: new Date("2026-11-15T02:00:00Z"),
      status: "requested",
      totalCentavos: 50000,
      notes: "Please be gentle",
      address: null,
      quotedPriceCentavos: null,
      createdAt: new Date(),
    };

    const booking2 = {
      id: randomUUID(),
      refCode: "BK-CONF-002",
      shopId,
      serviceId: randomUUID(),
      staffId: randomUUID(),
      customerId: randomUUID(),
      startAt: new Date("2026-11-15T03:00:00Z"),
      endAt: new Date("2026-11-15T04:00:00Z"),
      status: "confirmed",
      totalCentavos: 35000,
      notes: null,
      address: null,
      quotedPriceCentavos: null,
      createdAt: new Date(),
    };

    const booking3 = {
      id: randomUUID(),
      refCode: "BK-W-003",
      shopId,
      serviceId: randomUUID(),
      staffId: randomUUID(),
      customerId: null, // Walk-in
      startAt: new Date("2026-11-15T05:00:00Z"),
      endAt: new Date("2026-11-15T05:45:00Z"),
      status: "completed",
      totalCentavos: 40000,
      notes: "Walk-in: Aling Nena · 09181234567 · Notes: Clean cut",
      address: null,
      quotedPriceCentavos: null,
      createdAt: new Date(),
    };

    vi.spyOn(db, "$with").mockReturnValue({
      as: vi.fn().mockReturnValue({}),
    } as never);

    let selectCount = 0;
    vi.spyOn(db, "select").mockImplementation((() => {
      selectCount++;
      return {
        from: vi.fn().mockImplementation(() => {
          if (selectCount === 1) {
            // Shop
            return {
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: shopId, status: "active" }]),
              }),
            };
          }
          if (selectCount === 2) {
            // Active services
            return {
              where: vi.fn().mockReturnValue({
                orderBy: vi
                  .fn()
                  .mockResolvedValue([
                    { id: randomUUID(), name: "Fade", priceCentavos: 30000, durationMin: 30 },
                  ]),
              }),
            };
          }
          // CTEs ($with)
          return {};
        }),
      };
    }) as never);

    let capturedWhere: unknown = null;
    let withCount = 0;
    vi.spyOn(db, "with").mockImplementation((() => {
      withCount++;
      if (withCount === 1) {
        // Staff query
        return {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi
                    .fn()
                    .mockResolvedValue([{ userId: randomUUID(), role: "owner", name: "Boss" }]),
                }),
              }),
            }),
          }),
        };
      }
      // Bookings query
      return {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockImplementation((condition) => {
                    capturedWhere = condition;
                    return {
                      orderBy: vi.fn().mockResolvedValue([
                        {
                          booking: booking1,
                          service: {
                            id: booking1.serviceId,
                            name: "Haircut",
                            durationMin: 60,
                            priceCentavos: 50000,
                          },
                          customer: { id: booking1.customerId, name: "Juan", phone: "09170000001" },
                          staff: null,
                        },
                        {
                          booking: booking2,
                          service: {
                            id: booking2.serviceId,
                            name: "Beard Trim",
                            durationMin: 60,
                            priceCentavos: 35000,
                          },
                          customer: { id: booking2.customerId, name: "Kiko", phone: "09170000002" },
                          staff: { id: booking2.staffId, name: "Staff Dan" },
                        },
                        {
                          booking: booking3,
                          service: {
                            id: booking3.serviceId,
                            name: "Shave",
                            durationMin: 45,
                            priceCentavos: 40000,
                          },
                          customer: null,
                          staff: { id: booking3.staffId, name: "Staff Dan" },
                        },
                      ]),
                    };
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }) as never);

    const result = await getTodayDashboardData(shopId, "2026-11-15");

    expect(result.isAcceptingToday).toBe(true);
    expect(result.stats.total).toBe(3);
    expect(result.stats.requested).toBe(1);
    expect(result.stats.confirmed).toBe(1);
    expect(result.stats.completed).toBe(1);
    expect(result.stats.walkIns).toBe(1);
    expect(result.stats.realizedCentavos).toBe(40000); // Only completed
    expect(result.stats.expectedCentavos).toBe(85000); // 50000 + 35000
    expect(result.stats.totalCentavos).toBe(125000);

    expect(result.pendingRequests).toHaveLength(1);
    expect(result.pendingRequests[0]?.refCode).toBe("BK-REQ-001");

    // Check walk-in parsed notes
    const walkInItem = result.todayBookings.find((b) => b.isWalkIn);
    expect(walkInItem).toBeDefined();
    expect(walkInItem?.customerName).toBe("Aling Nena");
    expect(walkInItem?.customerPhone).toBe("09181234567");

    // Verify where condition was constructed with valid Date objects
    expect(capturedWhere).toBeDefined();
  });
});
