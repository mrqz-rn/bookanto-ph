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

const DESKTOP_NAV_ITEMS = [
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

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Clock, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/walk-ins", label: "Walk-ins", icon: Scissors },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export function DashboardSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-t border-neutral-100 bg-neutral-50/90 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl space-x-2 overflow-x-auto py-1 text-xs font-semibold">
        {DESKTOP_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 transition-all ${
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
    </div>
  );
}

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed right-0 bottom-0 left-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200 bg-white/95 px-2 shadow-lg backdrop-blur-md sm:hidden"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold transition-colors ${
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
