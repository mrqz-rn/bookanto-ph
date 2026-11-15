// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import type { TodayDashboardData } from "@/features/bookings/constants";
import {
  clearTodayBookingsCache,
  formatCacheTimestamp,
  getTodayBookingsCache,
  saveTodayBookingsCache,
} from "@/features/pwa/offline-bookings-cache";

describe("offline-bookings-cache", () => {
  const shopId = "shop-uuid-1234";

  const mockData: TodayDashboardData = {
    todayDateFormatted: "Sunday, November 15, 2026",
    isAcceptingToday: true,
    stats: {
      total: 1,
      requested: 0,
      confirmed: 1,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      walkIns: 0,
      realizedCentavos: 0,
      expectedCentavos: 50000,
      totalCentavos: 50000,
    },
    pendingRequests: [],
    todayBookings: [
      {
        id: "bk-1",
        refCode: "BK-100",
        customerId: "cust-1",
        customerName: "Juan Dela Cruz",
        customerPhone: "09181234567",
        shopId,
        serviceId: "srv-1",
        serviceName: "Standard Haircut",
        serviceDurationMin: 30,
        staffId: null,
        staffName: null,
        startAt: "2026-11-15T06:00:00Z",
        endAt: "2026-11-15T06:30:00Z",
        status: "confirmed",
        address: null,
        notes: "Fade cut please",
        quotedPriceCentavos: null,
        totalCentavos: 50000,
        isWalkIn: false,
        createdAt: "2026-11-15T04:00:00Z",
      },
    ],
    activeServices: [],
    shopStaff: [],
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists and retrieves today's dashboard bookings", () => {
    const success = saveTodayBookingsCache(shopId, mockData);
    expect(success).toBe(true);

    const cached = getTodayBookingsCache(shopId);
    expect(cached).not.toBeNull();
    expect(cached!.shopId).toBe(shopId);
    expect(cached!.data.todayBookings.length).toBe(1);
    expect(cached!.data.todayBookings[0]?.customerName).toBe("Juan Dela Cruz");
    expect(cached!.data.todayBookings[0]?.customerPhone).toBe("09181234567");
  });

  it("retrieves the last active shop cache if shopId is omitted", () => {
    saveTodayBookingsCache(shopId, mockData);

    const cached = getTodayBookingsCache();
    expect(cached).not.toBeNull();
    expect(cached!.shopId).toBe(shopId);
  });

  it("clears cached schedule for a specific shop", () => {
    saveTodayBookingsCache(shopId, mockData);
    clearTodayBookingsCache(shopId);

    const cached = getTodayBookingsCache(shopId);
    expect(cached).toBeNull();
  });

  it("formats timestamps gracefully", () => {
    const iso = "2026-11-15T06:30:00Z";
    const formatted = formatCacheTimestamp(iso);
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);

    const invalid = formatCacheTimestamp("invalid-date");
    expect(invalid).toBe("earlier today");
  });
});
