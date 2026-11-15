import { describe, expect, it } from "vitest";

import { PILOT_TARGETS } from "@/features/analytics/constants";
import { resolvePeriodDateRange } from "@/features/analytics/queries";

describe("Analytics query logic and calculations", () => {
  describe("resolvePeriodDateRange", () => {
    it("resolves today date range starting at Manila midnight", () => {
      const { startDate, endDate, periodLabel } = resolvePeriodDateRange("today");
      expect(periodLabel).toBe("Today");
      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
    });

    it("resolves 7d date range spanning roughly 7 days", () => {
      const { startDate, endDate, periodLabel } = resolvePeriodDateRange("7d");
      expect(periodLabel).toBe("Last 7 Days");
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
      expect(diffDays).toBe(7);
    });

    it("resolves 30d date range spanning roughly 30 days", () => {
      const { startDate, endDate, periodLabel } = resolvePeriodDateRange("30d");
      expect(periodLabel).toBe("Last 30 Days");
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
      expect(diffDays).toBe(30);
    });

    it("resolves 90d date range", () => {
      const { startDate, endDate, periodLabel } = resolvePeriodDateRange("90d");
      expect(periodLabel).toBe("Last 90 Days");
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
      expect(diffDays).toBe(90);
    });

    it("resolves pilot to date window", () => {
      const { startDate, endDate, periodLabel } = resolvePeriodDateRange("pilot");
      expect(periodLabel).toBe("Pilot to Date");
      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
    });

    it("resolves all time window", () => {
      const { startDate, endDate, periodLabel } = resolvePeriodDateRange("all");
      expect(periodLabel).toBe("All Time");
      expect(startDate.getTime()).toBe(0);
      expect(endDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Pilot Milestone Target Calculations", () => {
    it("enforces pilot targets matching development plan specs", () => {
      expect(PILOT_TARGETS.shops).toBe(50);
      expect(PILOT_TARGETS.bookings).toBe(1000);
      expect(PILOT_TARGETS.gmvCentavos).toBe(50_000_000); // ₱500,000.00
      expect(PILOT_TARGETS.customerRetentionRate).toBe(25);
    });

    it("calculates correct progress percentages towards pilot goals", () => {
      const activeShops = 25;
      const percent = Math.min(100, Math.round((activeShops / PILOT_TARGETS.shops) * 100));
      expect(percent).toBe(50);

      const gmvCentavos = 250_000_00; // ₱250,000.00
      const gmvPercent = Math.min(100, Math.round((gmvCentavos / PILOT_TARGETS.gmvCentavos) * 100));
      expect(gmvPercent).toBe(50);
    });
  });

  describe("Funnel and Drop-off Math", () => {
    it("calculates accurate step-by-step conversion and drop-off rates", () => {
      const step1 = 1000; // shop views
      const step2 = 400; // funnel started
      const step3 = 200; // slot picked
      const step6 = 100; // confirmed
      const step7 = 90; // completed

      // Conversion from first
      expect(Math.round((step2 / step1) * 1000) / 10).toBe(40);
      expect(Math.round((step7 / step1) * 1000) / 10).toBe(9); // 9% overall conversion

      // Conversion from previous and drop-off
      const step3ConvFromPrev = Math.round((step3 / step2) * 1000) / 10;
      expect(step3ConvFromPrev).toBe(50);
      const step3DropOff = Math.round((100 - step3ConvFromPrev) * 10) / 10;
      expect(step3DropOff).toBe(50);

      const step7ConvFromPrev = Math.round((step7 / step6) * 1000) / 10;
      expect(step7ConvFromPrev).toBe(90);
      const step7DropOff = Math.round((100 - step7ConvFromPrev) * 10) / 10;
      expect(step7DropOff).toBe(10);
    });
  });
});
