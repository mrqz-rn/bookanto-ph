import type {
  AnnouncementKind,
  FraudSeverity,
  FraudStatus,
  PlatformRole,
  ReportStatus,
  ShopStatus,
} from "@/lib/db/schema/enums";

/** Which count, if any, shows beside a nav item (getAdminNavCounts). */
export type AdminNavBadge = "pendingShops" | "openReports" | "activeFraud";

export type AdminNavItem = {
  href: string;
  label: string;
  /** A lucide icon name, mapped in admin-nav.tsx. */
  icon:
    | "LayoutDashboard"
    | "BarChart3"
    | "Store"
    | "FolderTree"
    | "Users"
    | "Calendar"
    | "Scale"
    | "Megaphone"
    | "ShieldAlert"
    | "History";
  /** Only this exact path, not its subpages. */
  exact?: boolean;
  badge?: AdminNavBadge;
  superAdminOnly?: boolean;
};

/** The admin console's pages, grouped the way an admin works through them. */
export const ADMIN_NAV_GROUPS: ReadonlyArray<{ label: string; items: readonly AdminNavItem[] }> = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true },
      { href: "/admin/analytics", label: "Pilot metrics", icon: "BarChart3" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/admin/shops", label: "Shops", icon: "Store", badge: "pendingShops" },
      { href: "/admin/bookings", label: "Bookings", icon: "Calendar" },
      { href: "/admin/users", label: "Users", icon: "Users" },
      { href: "/admin/categories", label: "Categories", icon: "FolderTree" },
    ],
  },
  {
    label: "Trust & safety",
    items: [
      { href: "/admin/disputes", label: "Disputes & reports", icon: "Scale", badge: "openReports" },
      { href: "/admin/fraud", label: "Fraud signals", icon: "ShieldAlert", badge: "activeFraud" },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: "Megaphone" },
      { href: "/admin/audit", label: "Audit log", icon: "History", superAdminOnly: true },
    ],
  },
];

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
