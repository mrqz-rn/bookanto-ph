"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CalendarClock,
  Clock,
  Inbox,
  Scissors,
  Settings,
  Star,
  Users,
} from "lucide-react";

import { getDashboardSkeletonForPath } from "./dashboard-skeletons";

export const DESKTOP_NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Clock, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/walk-ins", label: "Walk-ins", icon: Scissors },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/staff", label: "Staff Accounts", icon: Users },
  { href: "/dashboard/reports", label: "Revenue & Stats", icon: BarChart3 },
  { href: "/dashboard/services", label: "Services & Pricing", icon: Scissors },
  { href: "/dashboard/availability", label: "Availability", icon: CalendarClock },
  { href: "/dashboard/setup", label: "Shop Details", icon: Settings },
];

export const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Clock, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/walk-ins", label: "Walk-ins", icon: Scissors },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

type DashboardNavContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
};

const DashboardNavContext = React.createContext<DashboardNavContextValue | null>(null);

function isItemActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isPlainLeftClick(e: React.MouseEvent<HTMLAnchorElement>) {
  return (
    !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
  );
}

export function DashboardNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  // Clear pending state as soon as the route pathname updates
  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Safety timeout in case navigation is interrupted
  React.useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => {
      setPendingHref(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const value = React.useMemo(() => ({ pendingHref, setPendingHref }), [pendingHref]);

  return <DashboardNavContext.Provider value={value}>{children}</DashboardNavContext.Provider>;
}

export function DashboardContentSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ctx = React.useContext(DashboardNavContext);
  const pendingHref = ctx?.pendingHref ?? null;

  const isNavigating =
    pendingHref !== null && pendingHref !== pathname && !pathname.startsWith(`${pendingHref}/`);

  if (isNavigating && pendingHref) {
    return (
      <div className="animate-in duration-150 fade-in">
        {getDashboardSkeletonForPath(pendingHref)}
      </div>
    );
  }

  return <div className="animate-in duration-150 fade-in">{children}</div>;
}

export function DashboardSubNav() {
  const pathname = usePathname();
  const ctx = React.useContext(DashboardNavContext);
  const [localPendingHref, setLocalPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalPendingHref(null);
  }, [pathname]);

  const pendingHref = ctx ? ctx.pendingHref : localPendingHref;
  const setPendingHref = ctx ? ctx.setPendingHref : setLocalPendingHref;
  const activePathname = pendingHref ?? pathname;
  const isTransitioning = pendingHref !== null && pendingHref !== pathname;

  return (
    <div className="relative border-t border-neutral-100 bg-neutral-50/90 px-4 sm:px-6 lg:px-8">
      <div
        role="navigation"
        aria-label="Store Dashboard Tabs"
        className="mx-auto flex max-w-7xl space-x-2 overflow-x-auto py-1 text-xs font-semibold"
      >
        {DESKTOP_NAV_ITEMS.map((item) => {
          const isActive = isItemActive(activePathname, item);
          const isAlreadyCurrent = isItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                if (!isPlainLeftClick(e)) return;
                if (isAlreadyCurrent) {
                  setPendingHref(null);
                  return;
                }
                setPendingHref(item.href);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                isActive
                  ? "bg-green-100/70 font-bold text-green-800 shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <Icon className={`size-4 ${isActive ? "text-green-700" : "text-neutral-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Subtle progress bar during tab transition */}
      {isTransitioning && (
        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden bg-green-100"
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-green-600" />
        </div>
      )}
    </div>
  );
}

export function DashboardMobileNav() {
  const pathname = usePathname();
  const ctx = React.useContext(DashboardNavContext);
  const [localPendingHref, setLocalPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalPendingHref(null);
  }, [pathname]);

  const pendingHref = ctx ? ctx.pendingHref : localPendingHref;
  const setPendingHref = ctx ? ctx.setPendingHref : setLocalPendingHref;
  const activePathname = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed right-0 bottom-0 left-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200 bg-white/95 px-2 shadow-lg backdrop-blur-md sm:hidden"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = isItemActive(activePathname, item);
        const isAlreadyCurrent = isItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => {
              if (!isPlainLeftClick(e)) return;
              if (isAlreadyCurrent) {
                setPendingHref(null);
                return;
              }
              setPendingHref(item.href);
            }}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold transition-colors duration-150 ${
              isActive ? "font-bold text-green-700" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Icon className={`size-5 ${isActive ? "text-green-600" : "text-neutral-500"}`} />
            <span className="mt-0.5">{item.label}</span>
            {isActive && <span className="mt-0.5 size-1 rounded-full bg-green-600" />}
          </Link>
        );
      })}
    </nav>
  );
}
