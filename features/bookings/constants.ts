import type { BookingStatus, BookingType, ShopRole } from "@/lib/db/schema/enums";

export type BookingStatusConfig = {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
};

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, BookingStatusConfig> = {
  requested: {
    label: "Requested",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
    dotClass: "bg-amber-500",
    description: "Waiting for shop confirmation.",
  },
  quoted: {
    label: "Quoted",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-200",
    dotClass: "bg-blue-500",
    description: "Quote sent to customer.",
  },
  confirmed: {
    label: "Confirmed",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
    dotClass: "bg-emerald-500",
    description: "Appointment is confirmed and scheduled.",
  },
  declined: {
    label: "Declined",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
    dotClass: "bg-rose-500",
    description: "Shop declined this booking request.",
  },
  expired: {
    label: "Expired",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
    description: "Request expired without response.",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-neutral-100 text-neutral-700 border-neutral-200",
    dotClass: "bg-neutral-400",
    description: "Booking was cancelled.",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-200",
    dotClass: "bg-teal-600",
    description: "Service has been completed.",
  },
  no_show: {
    label: "No-Show",
    badgeClass: "bg-orange-100 text-orange-900 border-orange-200",
    dotClass: "bg-orange-500",
    description: "Customer did not show up for appointment.",
  },
};

export type BookingListItem = {
  id: string;
  refCode: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  shopId: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMin: number;
  staffId: string | null;
  staffName: string | null;
  startAt: string; // ISO string
  endAt: string | null; // ISO string
  status: BookingStatus;
  address: string | null;
  notes: string | null;
  quotedPriceCentavos: number | null;
  totalCentavos: number | null;
  isWalkIn: boolean;
  createdAt: string;
  /** When an unanswered request lapses (ISO). Optional: older offline caches lack it. */
  expiresAt?: string | null;
  /** Slot, home, quote or queue. Optional for the same reason. */
  bookingType?: BookingType;
};

/**
 * The shop's hours for one Manila day, as UTC instants (ISO). Null in place of
 * this object means no hours are set for that weekday.
 */
export type TodayHours = {
  opensAt: string;
  closesAt: string;
  breakStartAt: string | null;
  breakEndAt: string | null;
  /** Set (possibly to "") when a closure covers the day; the hours then don't apply. */
  closedReason: string | null;
};

export type BookingEventItem = {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorId: string | null;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
};

export type BookingDetail = BookingListItem & {
  events: BookingEventItem[];
};

export type TodayStats = {
  total: number;
  requested: number;
  confirmed: number;
  completed: number;
  noShow: number;
  cancelled: number;
  walkIns: number;
  realizedCentavos: number;
  expectedCentavos: number;
  totalCentavos: number;
};

export type TodayDashboardData = {
  todayDateFormatted: string;
  isAcceptingToday: boolean;
  stats: TodayStats;
  todayBookings: BookingListItem[];
  pendingRequests: BookingListItem[];
  activeServices: Array<{
    id: string;
    name: string;
    priceCentavos: number | null;
    durationMin: number;
  }>;
  shopStaff: Array<{ userId: string; name: string; role: ShopRole }>;
};

export type RevenueDailyPoint = {
  date: string;
  label: string;
  bookingsCount: number;
  grossCentavos: number;
};

export type RevenueServiceBreakdown = {
  serviceId: string;
  serviceName: string;
  bookingsCount: number;
  grossCentavos: number;
  sharePercentage: number;
};

export type RevenueStaffPerformance = {
  staffId: string;
  staffName: string;
  role: ShopRole;
  assignedCount: number;
  completedCount: number;
  grossCentavos: number;
};

export type ShopRevenueStats = {
  period: string;
  periodLabel: string;
  grossCentavos: number;
  completedCount: number;
  totalBookings: number;
  averageCentavos: number;
  noShowRate: number;
  completionRate: number;
  walkInRate: number;
  dailyTrend: RevenueDailyPoint[];
  topServices: RevenueServiceBreakdown[];
  staffPerformance: RevenueStaffPerformance[];
};
