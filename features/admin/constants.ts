import type {
  AnnouncementKind,
  FraudSeverity,
  FraudStatus,
  PlatformRole,
  ReportStatus,
  ShopStatus,
} from "@/lib/db/schema/enums";

export const ADMIN_NAV_LINKS = [
  {
    href: "/admin",
    label: "Overview",
    icon: "LayoutDashboard",
    description: "System stats, urgent tasks, and operational pulse",
  },
  {
    href: "/admin/analytics",
    label: "Pilot Metrics",
    icon: "BarChart3",
    description: "Booking funnel events, conversion rates, and pilot KPIs",
  },
  {
    href: "/admin/shops",
    label: "Shops",
    icon: "Store",
    description: "Shop approvals, verifications, and status moderation",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: "FolderTree",
    description: "Manage service categories, icons, and booking types",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "Users",
    description: "Customer and staff management, roles, and suspensions",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: "Calendar",
    description: "All platform bookings oversight and lifecycle tracking",
  },
  {
    href: "/admin/disputes",
    label: "Disputes & Reports",
    icon: "Scale",
    description: "Booking disputes and inappropriate review moderation",
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: "Megaphone",
    description: "Broadcast platform alerts and maintenance messages",
  },
  {
    href: "/admin/fraud",
    label: "Fraud Signals",
    icon: "ShieldAlert",
    description: "Risk detection, cancellation spikes, and velocity signals",
  },
  {
    href: "/admin/audit",
    label: "Audit Log",
    icon: "History",
    description: "Immutable history of sensitive admin and system actions",
    superAdminOnly: true,
  },
] as const;

export const SHOP_STATUS_COLORS: Record<ShopStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-neutral-300",
  pending: "bg-amber-50 text-amber-800 border-amber-300",
  active: "bg-emerald-50 text-emerald-800 border-emerald-300",
  suspended: "bg-rose-50 text-rose-800 border-rose-300",
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  open: "bg-amber-50 text-amber-800 border-amber-300",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  dismissed: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export const FRAUD_SEVERITY_COLORS: Record<FraudSeverity, string> = {
  low: "bg-blue-50 text-blue-800 border-blue-300",
  medium: "bg-amber-50 text-amber-800 border-amber-300",
  high: "bg-orange-50 text-orange-800 border-orange-300",
  critical: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
};

export const FRAUD_STATUS_COLORS: Record<FraudStatus, string> = {
  active: "bg-rose-50 text-rose-800 border-rose-300",
  investigating: "bg-amber-50 text-amber-800 border-amber-300",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  dismissed: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export const ANNOUNCEMENT_KIND_COLORS: Record<AnnouncementKind, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-300",
  warning: "bg-amber-50 text-amber-800 border-amber-300",
  critical: "bg-rose-50 text-rose-800 border-rose-300",
  maintenance: "bg-purple-50 text-purple-800 border-purple-300",
};

export const PLATFORM_ROLE_COLORS: Record<PlatformRole, string> = {
  customer: "bg-neutral-100 text-neutral-800 border-neutral-300",
  admin: "bg-blue-50 text-blue-800 border-blue-300",
  super_admin: "bg-purple-50 text-purple-800 border-purple-300",
};

export const DEFAULT_PAGE_SIZE = 20;
