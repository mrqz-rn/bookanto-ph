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
      { href: "/admin/analytics", label: "Metrics", icon: "BarChart3" },
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

/** Status words shop owners also see in their dashboard. */
export const SHOP_STATUS_LABELS: Record<ShopStatus, string> = {
  pending: "In review",
  active: "Active",
  draft: "Draft",
  suspended: "Suspended",
};

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

/** The bookings list's tabs, each a group of statuses (or open disputes). */
export const ADMIN_BOOKING_VIEWS = [
  "all",
  "waiting",
  "confirmed",
  "completed",
  "disputed",
  "closed",
] as const;
export type AdminBookingView = (typeof ADMIN_BOOKING_VIEWS)[number];

/** How the booking happens, in plain words. */
export const BOOKING_TYPE_LABELS: Record<string, string> = {
  slot: "At the shop",
  home: "Home service",
  quote: "Priced on request",
  queue: "Walk-in queue",
};

export const ADMIN_BOOKING_VIEW_LABELS: Record<AdminBookingView, string> = {
  waiting: "Waiting for reply",
  confirmed: "Confirmed",
  completed: "Completed",
  disputed: "Disputed",
  closed: "Cancelled or missed",
  all: "All bookings",
};

/** Plain names for fraud signal types. */
export const FRAUD_SIGNAL_LABELS: Record<string, string> = {
  excessive_cancellations: "Many cancellations",
  excessive_no_shows: "Many no-shows",
  burst_bookings: "Burst of bookings",
  dispute_rate_high: "High dispute rate",
  review_abuse: "Review abuse",
  suspicious_velocity: "Suspicious activity speed",
  custom: "Flagged by an admin",
};

/** Plain sentences for the audit actions an admin most often scans for. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "shop.create": "registered a shop",
  "shop.submitted_for_verification": "sent a shop for review",
  "shop.verified": "approved a shop",
  "shop.rejected": "rejected a shop",
  "shop.suspended": "suspended a shop",
  "shop.unsuspended": "restored a shop",
  "shop.document_uploaded": "uploaded a verification document",
  "shop.document_removed": "removed a verification document",
  "user.registered": "created an account",
  "user.role_changed": "changed a user's role",
  "user.suspended": "suspended a user",
  "user.unsuspended": "restored a user",
  "user.account_deleted": "deleted their account",
  "report.resolved": "resolved a report",
  "review.reported": "reported a review",
  "booking.viewed_by_admin": "opened a booking",
  "payment.refunded": "refunded a payment",
  "admin.signed_in": "signed in to the admin console",
  "admin.two_factor_enabled": "turned on two-factor sign-in",
  "auth.password_reset_requested": "asked for a password reset link",
  "auth.password_reset": "reset their password",
};

/** A plain label for an audit action; unknown ones read as words ("shop update hours"). */
export function auditActionLabel(action: string): string {
  const known = AUDIT_ACTION_LABELS[action];
  if (known) return known;
  return action.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
}
