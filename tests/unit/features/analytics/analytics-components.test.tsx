// @vitest-environment jsdom
import type * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CohortMatrixTable } from "@/features/analytics/components/cohort-matrix-table";
import { FunnelChart } from "@/features/analytics/components/funnel-chart";
import { MetricsDashboard } from "@/features/analytics/components/metrics-dashboard";
import { ShopAnalyticsView } from "@/features/analytics/components/shop-analytics-view";
import type {
  BookingFunnelData,
  CohortReportData,
  PilotMetricsData,
  ShopAnalyticsData,
} from "@/features/analytics/constants";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
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

      expect(screen.getByRole("heading", { name: "Booking funnel" })).toBeInTheDocument();
      expect(screen.getByText("9%")).toBeInTheDocument();
      expect(screen.getByText("Shop Profile Viewed")).toBeInTheDocument();
      expect(screen.getByText("Funnel Started")).toBeInTheDocument();
      expect(screen.getByText("Service Completed")).toBeInTheDocument();
    });

    it("shows each drop-off between the two steps it belongs to", () => {
      render(<FunnelChart data={mockFunnelData} />);

      // dropOffRate is the share lost on the way into a step, so the first step has none.
      const items = screen.getAllByRole("listitem");
      expect(items[0]).not.toHaveTextContent("drop off");
      expect(items[1]).toHaveTextContent("50% drop off");
      expect(items[2]).toHaveTextContent("40% drop off");
    });

    it("calls out the biggest drop", () => {
      render(<FunnelChart data={mockFunnelData} />);

      expect(
        screen.getByText(/drop\s+off between shop profile viewed and funnel started/),
      ).toBeInTheDocument();
    });

    it("renders an empty state when nothing was tracked", () => {
      render(
        <FunnelChart
          data={{
            ...mockFunnelData,
            overallConversionRate: 0,
            steps: mockFunnelData.steps.map((step) => ({ ...step, count: 0 })),
          }}
        />,
      );

      expect(screen.getByText("No funnel events in this period")).toBeInTheDocument();
    });
  });

  describe("CohortMatrixTable", () => {
    it("renders retention matrix rows and cohort summary metrics", () => {
      render(<CohortMatrixTable data={mockCohortData} />);

      expect(screen.getByRole("heading", { name: "Customer retention" })).toBeInTheDocument();
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
      expect(screen.getByText("No cohort history yet")).toBeInTheDocument();
    });
  });

  describe("MetricsDashboard", () => {
    const pilotRange = { kind: "pilot", from: "2026-12-01", to: "2027-07-31" } as const;
    const customRange = { kind: "custom", from: "2026-10-01", to: "2026-11-21" } as const;
    const renderDashboard = (props: Partial<React.ComponentProps<typeof MetricsDashboard>> = {}) =>
      render(
        <MetricsDashboard
          metrics={mockPilotMetrics}
          cohorts={mockCohortData}
          range={pilotRange}
          today="2026-11-21"
          {...props}
        />,
      );

    it("renders the pilot targets with their progress", () => {
      renderDashboard();

      expect(screen.getByRole("heading", { level: 1, name: "Metrics" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Pilot targets" })).toBeInTheDocument();
      expect(screen.getByText("Active partner shops")).toBeInTheDocument();
      expect(screen.getByText("Gross merchandise value")).toBeInTheDocument();
      expect(screen.getByText("Repeat customer rate")).toBeInTheDocument();
      // 180 of the 1,000-booking target.
      expect(
        screen.getByRole("progressbar", { name: "Bookings, share of target" }),
      ).toHaveAttribute("aria-valuenow", "18");
      expect(screen.getByRole("link", { name: /5 waiting for approval/ })).toHaveAttribute(
        "href",
        "/admin/shops?status=pending",
      );
    });

    it("shows every section on one page, without tabs", () => {
      renderDashboard();

      for (const name of [
        "Bookings and revenue",
        "Booking funnel",
        "Customer retention",
        "Bookings by category",
        "Bookings by city",
      ]) {
        expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      }
      expect(screen.getByText("Quezon City")).toBeInTheDocument();
    });

    it("defaults to the pilot window, Dec 2026 to Jul 2027", () => {
      renderDashboard();

      expect(screen.getByRole("button", { name: "Pilot" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("the pilot, Dec 1, 2026 – Jul 31, 2027")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /See the whole pilot/ })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    });

    it("applies a custom date range through the URL", () => {
      renderDashboard();

      fireEvent.click(screen.getByRole("button", { name: "Custom range" }));
      // Defaults to the last 30 days.
      expect(screen.getByLabelText("From")).toHaveValue("2026-10-23");
      expect(screen.getByLabelText("To")).toHaveValue("2026-11-21");

      fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
      fireEvent.click(screen.getByRole("button", { name: "Show these dates" }));

      expect(push).toHaveBeenCalledWith("/admin/analytics?from=2026-10-01&to=2026-11-21", {
        scroll: false,
      });
    });

    it("shows an error under the end date when it comes before the start", () => {
      renderDashboard();

      fireEvent.click(screen.getByRole("button", { name: "Custom range" }));
      fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-01" } });
      fireEvent.click(screen.getByRole("button", { name: "Show these dates" }));

      expect(screen.getByText("Pick a date on or after the start date.")).toBeInTheDocument();
      expect(screen.getByLabelText("To")).toHaveAttribute("aria-invalid", "true");
      expect(push).not.toHaveBeenCalled();
    });

    it("keeps a custom range open and offers the whole pilot", () => {
      renderDashboard({ range: customRange });

      expect(screen.getByRole("button", { name: "Custom range" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByLabelText("From")).toHaveValue("2026-10-01");
      expect(screen.getByText("Oct 1 – Nov 21, 2026")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /See the whole pilot/ }));
      expect(push).toHaveBeenCalledWith("/admin/analytics", { scroll: false });
    });

    it("says so when the URL's dates didn't parse", () => {
      renderDashboard({ invalidRange: true });

      expect(screen.getByRole("status")).toHaveTextContent("Those dates didn't work");
    });

    it("switches the trend chart between bookings and revenue", () => {
      renderDashboard();

      const revenue = screen.getByRole("button", { name: "Revenue" });
      fireEvent.click(revenue);
      expect(revenue).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText(/Value of completed bookings, per day/)).toBeInTheDocument();
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
