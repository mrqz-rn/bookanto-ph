import type { FunnelStep } from "@/lib/db/schema/enums";

export const ANALYTICS_PERIODS = [
  { key: "today", label: "Today", shortLabel: "Today" },
  { key: "7d", label: "Last 7 Days", shortLabel: "7 days" },
  { key: "30d", label: "Last 30 Days", shortLabel: "30 days" },
  { key: "90d", label: "Last 90 Days", shortLabel: "90 days" },
  { key: "pilot", label: "Pilot to Date", shortLabel: "Pilot to date" },
  { key: "all", label: "All Time", shortLabel: "All time" },
] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]["key"];

export const PILOT_TARGETS = {
  shops: 50,
  bookings: 1000,
  gmvCentavos: 50000000, // ₱500,000.00
  customerRetentionRate: 25, // 25% target repeat rate
} as const;

export const FUNNEL_STEP_METADATA: Record<
  FunnelStep,
  { label: string; description: string; order: number }
> = {
  view_shop: {
    label: "Shop Profile Viewed",
    description: "Customer viewed shop profile page or services list",
    order: 1,
  },
  select_service: {
    label: "Funnel Started",
    description: "Customer initiated booking for a specific service",
    order: 2,
  },
  select_slot: {
    label: "Time Slot Picked",
    description: "Customer chose an available appointment date and time",
    order: 3,
  },
  enter_details: {
    label: "Details Entered",
    description: "Customer provided address, notes, or preferences",
    order: 4,
  },
  submit_booking: {
    label: "Booking Submitted",
    description: "Customer clicked submit to request or reserve booking",
    order: 5,
  },
  confirmed: {
    label: "Booking Confirmed",
    description: "Shop accepted or confirmed the booking request",
    order: 6,
  },
  completed: {
    label: "Service Completed",
    description: "Service completed and marked fulfilled",
    order: 7,
  },
};

export type FunnelStepMetric = {
  step: FunnelStep;
  label: string;
  order: number;
  count: number;
  conversionFromFirst: number; // percentage (0 - 100)
  conversionFromPrevious: number; // percentage (0 - 100)
  dropOffRate: number; // percentage (0 - 100)
};

export type BookingFunnelData = {
  period: string;
  totalStarts: number;
  totalCompletions: number;
  overallConversionRate: number; // percentage (0 - 100)
  steps: FunnelStepMetric[];
};

export type PilotMetricsData = {
  period: string;
  periodLabel: string;
  // Shops
  shopsTotal: number;
  shopsActive: number;
  shopsPending: number;
  shopsTarget: number;
  shopsTargetPercent: number;
  // Users
  totalCustomers: number;
  activeCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  // Bookings
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  // Financials
  gmvCentavos: number;
  averageOrderValueCentavos: number;
  targetGmvCentavos: number;
  gmvTargetPercent: number;
  // Funnel
  funnel: BookingFunnelData;
  // Category breakdown
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    bookingsCount: number;
    gmvCentavos: number;
  }>;
  // City breakdown
  cityBreakdown: Array<{
    cityId: string;
    cityName: string;
    bookingsCount: number;
    gmvCentavos: number;
  }>;
  // Daily trends
  dailyTrends: Array<{
    date: string;
    bookingsCount: number;
    completedCount: number;
    gmvCentavos: number;
  }>;
};

export type ShopAnalyticsData = {
  shopId: string;
  shopName: string;
  period: string;
  periodLabel: string;
  grossCentavos: number;
  averageBookingValueCentavos: number;
  totalBookings: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  walkInCount: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  // Customer Retention
  uniqueCustomers: number;
  firstTimeCustomers: number;
  returningCustomers: number;
  repeatCustomerRate: number;
  // Busiest Days of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  busiestDays: Array<{
    dayIndex: number;
    dayName: string;
    bookingsCount: number;
    grossCentavos: number;
  }>;
  // Peak Hours Heatmap (8 to 20)
  peakHours: Array<{
    hour: number;
    hourLabel: string;
    bookingsCount: number;
  }>;
  // Services Breakdown
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    bookingsCount: number;
    grossCentavos: number;
  }>;
  // Staff Breakdown
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    assignedCount: number;
    completedCount: number;
    grossCentavos: number;
    completionRate: number;
  }>;
  // Shop Funnel
  funnel: BookingFunnelData;
  // Daily Trend
  dailyTrends: Array<{
    date: string;
    bookingsCount: number;
    completedCount: number;
    grossCentavos: number;
  }>;
};

export type CohortPeriodActivity = {
  periodIndex: number; // 0 = initial period (M0), 1 = M1, 2 = M2, etc.
  label: string; // "M0", "M1", "M2"
  activeUsers: number;
  retentionRate: number; // 0 - 100%
  spendCentavos: number;
};

export type CustomerCohort = {
  cohortKey: string; // e.g. "2026-06" or "2026-W24"
  cohortLabel: string; // e.g. "Jun 2026" or "Week 24, 2026"
  cohortSize: number; // unique customers in this cohort
  totalSpendCentavos: number;
  cumulativeLtvCentavos: number;
  averageBookingsPerCustomer: number;
  retentionPeriods: CohortPeriodActivity[];
};

export type CohortReportData = {
  periodType: "monthly" | "weekly";
  maxPeriods: number;
  cohorts: CustomerCohort[];
  summary: {
    totalCohorts: number;
    totalTrackedCustomers: number;
    averageM1Retention: number;
    averageM2Retention: number;
    averageM3Retention: number;
    overallAverageLtvCentavos: number;
  };
};
