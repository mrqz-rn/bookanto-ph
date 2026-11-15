// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CohortMatrixTable } from "@/features/analytics/components/cohort-matrix-table";
import { FunnelChart } from "@/features/analytics/components/funnel-chart";
import { PilotMetricsDashboard } from "@/features/analytics/components/pilot-metrics-dashboard";
import { ShopAnalyticsView } from "@/features/analytics/components/shop-analytics-view";
import type {
  BookingFunnelData,
  CohortReportData,
  PilotMetricsData,
  ShopAnalyticsData,
} from "@/features/analytics/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockFunnelData: BookingFunnelData = {
  period: "Last 30 Days",
  totalStarts: 500,
  totalCompletions: 45,
  overallConversionRate: 9,
  steps: [
    {
      step: "view_shop",
      label: "Shop Profile Viewed",
      order: 1,
      count: 500,
      conversionFromFirst: 100,
      conversionFromPrevious: 100,
      dropOffRate: 0,
    },
    {
      step: "select_service",
      label: "Funnel Started",
      order: 2,
      count: 250,
      conversionFromFirst: 50,
      conversionFromPrevious: 50,
      dropOffRate: 50,
    },
    {
      step: "select_slot",
      label: "Time Slot Picked",
      order: 3,
      count: 150,
      conversionFromFirst: 30,
      conversionFromPrevious: 60,
      dropOffRate: 40,
    },
    {
      step: "enter_details",
      label: "Details Entered",
      order: 4,
      count: 120,
      conversionFromFirst: 24,
      conversionFromPrevious: 80,
      dropOffRate: 20,
    },
    {
      step: "submit_booking",
      label: "Booking Submitted",
      order: 5,
      count: 80,
      conversionFromFirst: 16,
      conversionFromPrevious: 66.7,
      dropOffRate: 33.3,
    },
    {
      step: "confirmed",
      label: "Booking Confirmed",
      order: 6,
      count: 60,
      conversionFromFirst: 12,
      conversionFromPrevious: 75,
      dropOffRate: 25,
    },
    {
      step: "completed",
      label: "Service Completed",
      order: 7,
      count: 45,
      conversionFromFirst: 9,
      conversionFromPrevious: 75,
      dropOffRate: 25,
    },
  ],
};

const mockCohortData: CohortReportData = {
  periodType: "monthly",
  maxPeriods: 6,
  cohorts: [
    {
      cohortKey: "2026-09",
      cohortLabel: "Sep 2026",
      cohortSize: 50,
      totalSpendCentavos: 7500000,
      cumulativeLtvCentavos: 150000,
      averageBookingsPerCustomer: 2.1,
      retentionPeriods: [
        {
          periodIndex: 0,
          label: "M0",
          activeUsers: 50,
          retentionRate: 100,
          spendCentavos: 2500000,
        },
        { periodIndex: 1, label: "M1", activeUsers: 20, retentionRate: 40, spendCentavos: 2000000 },
        { periodIndex: 2, label: "M2", activeUsers: 15, retentionRate: 30, spendCentavos: 1500000 },
        { periodIndex: 3, label: "M3", activeUsers: 10, retentionRate: 20, spendCentavos: 1500000 },
      ],
    },
    {
      cohortKey: "2026-10",
      cohortLabel: "Oct 2026",
      cohortSize: 60,
      totalSpendCentavos: 6000000,
      cumulativeLtvCentavos: 100000,
      averageBookingsPerCustomer: 1.5,
      retentionPeriods: [
        {
          periodIndex: 0,
          label: "M0",
          activeUsers: 60,
          retentionRate: 100,
          spendCentavos: 3000000,
        },
        {
          periodIndex: 1,
          label: "M1",
          activeUsers: 25,
          retentionRate: 41.7,
          spendCentavos: 3000000,
        },
      ],
    },
  ],
  summary: {
    totalCohorts: 2,
    totalTrackedCustomers: 110,
    averageM1Retention: 40.9,
    averageM2Retention: 30,
    averageM3Retention: 20,
    overallAverageLtvCentavos: 122700,
  },
};

const mockPilotMetrics: PilotMetricsData = {
  period: "30d",
  periodLabel: "Last 30 Days",
  shopsTotal: 30,
  shopsActive: 25,
  shopsPending: 5,
  shopsTarget: 50,
  shopsTargetPercent: 50,
  totalCustomers: 450,
  activeCustomers: 120,
  repeatCustomers: 36,
  repeatCustomerRate: 30,
  totalBookings: 180,
  completedBookings: 140,
  cancelledBookings: 25,
  noShowBookings: 15,
  completionRate: 77.8,
  cancellationRate: 13.9,
  noShowRate: 8.3,
  gmvCentavos: 18500000,
  averageOrderValueCentavos: 132142,
  targetGmvCentavos: 50000000,
  gmvTargetPercent: 37,
  funnel: mockFunnelData,
  categoryBreakdown: [
    { categoryId: "cat-1", categoryName: "Barbershop", bookingsCount: 100, gmvCentavos: 10000000 },
    { categoryId: "cat-2", categoryName: "Salon", bookingsCount: 80, gmvCentavos: 8500000 },
  ],
  cityBreakdown: [
    { cityId: "city-1", cityName: "Quezon City", bookingsCount: 110, gmvCentavos: 11000000 },
    { cityId: "city-2", cityName: "Makati", bookingsCount: 70, gmvCentavos: 7500000 },
  ],
  dailyTrends: [
    { date: "2026-11-10", bookingsCount: 8, completedCount: 6, gmvCentavos: 800000 },
    { date: "2026-11-11", bookingsCount: 12, completedCount: 10, gmvCentavos: 1200000 },
  ],
};

const mockShopAnalytics: ShopAnalyticsData = {
  shopId: "shop-123",
  shopName: "Kuya Jun Barbershop",
  period: "30d",
  periodLabel: "Last 30 Days",
  grossCentavos: 8500000,
  averageBookingValueCentavos: 150000,
  totalBookings: 70,
  completedCount: 56,
  cancelledCount: 8,
  noShowCount: 6,
  walkInCount: 15,
  completionRate: 80,
  cancellationRate: 11.4,
  noShowRate: 8.6,
  uniqueCustomers: 45,
  firstTimeCustomers: 30,
  returningCustomers: 15,
  repeatCustomerRate: 33.3,
  busiestDays: [
    { dayIndex: 0, dayName: "Sunday", bookingsCount: 18, grossCentavos: 2500000 },
    { dayIndex: 6, dayName: "Saturday", bookingsCount: 22, grossCentavos: 3000000 },
  ],
  peakHours: [
    { hour: 10, hourLabel: "10:00 AM", bookingsCount: 8 },
    { hour: 14, hourLabel: "2:00 PM", bookingsCount: 12 },
    { hour: 17, hourLabel: "5:00 PM", bookingsCount: 15 },
  ],
  topServices: [
    { serviceId: "srv-1", serviceName: "Classic Fade", bookingsCount: 35, grossCentavos: 5250000 },
    { serviceId: "srv-2", serviceName: "Beard Trim", bookingsCount: 21, grossCentavos: 3250000 },
  ],
  staffPerformance: [
    {
      staffId: "st-1",
      staffName: "Jun Barber",
      assignedCount: 40,
      completedCount: 36,
      grossCentavos: 5500000,
      completionRate: 90,
    },
  ],
  funnel: mockFunnelData,
  dailyTrends: [{ date: "2026-11-10", bookingsCount: 5, completedCount: 4, grossCentavos: 600000 }],
};

describe("Analytics UI Components", () => {
  describe("FunnelChart", () => {
    it("renders booking funnel steps and overall conversion rate", () => {
      render(<FunnelChart data={mockFunnelData} />);

      expect(screen.getByText("Booking Funnel Conversion")).toBeInTheDocument();
      expect(screen.getAllByText("9%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("1. Shop Profile Viewed")).toBeInTheDocument();
      expect(screen.getByText("2. Funnel Started")).toBeInTheDocument();
      expect(screen.getByText("7. Service Completed")).toBeInTheDocument();
    });

    it("displays drop-off rates between stages", () => {
      render(<FunnelChart data={mockFunnelData} />);

      expect(screen.getByText("50% drop-off to next step")).toBeInTheDocument();
      expect(screen.getByText("40% drop-off to next step")).toBeInTheDocument();
    });
  });

  describe("CohortMatrixTable", () => {
    it("renders retention matrix rows and cohort summary metrics", () => {
      render(<CohortMatrixTable data={mockCohortData} />);

      expect(screen.getByText("Customer Cohort Retention")).toBeInTheDocument();
      expect(screen.getByText("40.9%")).toBeInTheDocument();
      expect(screen.getByText("Sep 2026")).toBeInTheDocument();
      expect(screen.getByText("Oct 2026")).toBeInTheDocument();
    });

    it("renders empty state when no cohorts are available", () => {
      const emptyCohortData: CohortReportData = {
        periodType: "monthly",
        maxPeriods: 6,
        cohorts: [],
        summary: {
          totalCohorts: 0,
          totalTrackedCustomers: 0,
          averageM1Retention: 0,
          averageM2Retention: 0,
          averageM3Retention: 0,
          overallAverageLtvCentavos: 0,
        },
      };

      render(<CohortMatrixTable data={emptyCohortData} />);
      expect(screen.getByText("No Cohort History Yet")).toBeInTheDocument();
    });
  });

  describe("PilotMetricsDashboard", () => {
    it("renders pilot launch milestone targets and key KPIs", () => {
      render(
        <PilotMetricsDashboard
          metrics={mockPilotMetrics}
          cohorts={mockCohortData}
          currentPeriod="30d"
        />,
      );

      expect(screen.getByText("Pilot Metrics Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Pilot Milestone Targets")).toBeInTheDocument();
      expect(screen.getByText("Active Partner Shops")).toBeInTheDocument();
      expect(screen.getByText("Gross Merchandise Value")).toBeInTheDocument();
      expect(screen.getByText("Completed Bookings")).toBeInTheDocument();
    });

    it("switches tabs between overview, funnel, and cohorts", () => {
      render(
        <PilotMetricsDashboard
          metrics={mockPilotMetrics}
          cohorts={mockCohortData}
          currentPeriod="30d"
        />,
      );

      const cohortTabButton = screen.getByRole("button", { name: /Cohort Retention/i });
      fireEvent.click(cohortTabButton);

      expect(screen.getByText("Platform-Wide Customer Cohorts")).toBeInTheDocument();
    });
  });

  describe("ShopAnalyticsView", () => {
    it("renders shop-level stats, revenue, and busiest days", () => {
      render(
        <ShopAnalyticsView
          stats={mockShopAnalytics}
          cohorts={mockCohortData}
          currentPeriod="30d"
        />,
      );

      expect(screen.getByText("Shop Analytics & Reports")).toBeInTheDocument();
      expect(screen.getByText("Gross Revenue")).toBeInTheDocument();
      expect(screen.getByText("Top Services by Revenue")).toBeInTheDocument();
      expect(screen.getByText("Classic Fade")).toBeInTheDocument();
    });

    it("switches tabs to schedule and displays busiest times", () => {
      render(
        <ShopAnalyticsView
          stats={mockShopAnalytics}
          cohorts={mockCohortData}
          currentPeriod="30d"
        />,
      );

      const scheduleTabButton = screen.getByRole("button", { name: /Busiest Times & Heatmap/i });
      fireEvent.click(scheduleTabButton);

      expect(screen.getByText("Busiest Days of the Week")).toBeInTheDocument();
      expect(screen.getByText("Peak Hours Heatmap")).toBeInTheDocument();
    });
  });
});
