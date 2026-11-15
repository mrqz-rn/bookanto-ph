import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CalendarClock,
  Clock,
  ExternalLink,
  Inbox,
  Scissors,
  Settings,
  Store,
  User,
  Users,
} from "lucide-react";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { getUserShops } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shop Dashboard | BooKanto",
  description: "Manage your shop, bookings, calendar, staff, and revenue reports.",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const shops = await getUserShops();
  const currentShop = shops[0] || null;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-16 sm:pb-0">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-2xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <LogoMark className="h-9" />
              <Wordmark className="text-xl" />
            </Link>

            {currentShop && (
              <div className="hidden items-center gap-2 border-l border-neutral-200 pl-4 sm:flex">
                <Store className="size-4 text-orange-600" />
                <span className="text-navy-950 text-sm font-bold">{currentShop.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                    currentShop.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : currentShop.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {currentShop.status}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentShop?.slug && (
              <Button asChild variant="outline" size="sm" className="hidden text-xs sm:inline-flex">
                <Link href={`/shop/${currentShop.slug}`} target="_blank">
                  View Public Shop <ExternalLink className="ml-1 size-3" />
                </Link>
              </Button>
            )}

            <Button asChild variant="ghost" size="sm" className="text-xs text-neutral-700">
              <Link href="/account">
                <User className="mr-1.5 size-4" />
                Account
              </Link>
            </Button>
          </div>
        </div>

        {/* Secondary Sub-nav for Dashboard links (Desktop & Tablets) */}
        <div className="border-t border-neutral-100 bg-neutral-50/90 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl space-x-5 overflow-x-auto py-1 text-xs font-semibold">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Clock className="size-4 text-orange-600" />
              Today
            </Link>
            <Link
              href="/dashboard/inbox"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Inbox className="size-4" />
              Inbox
            </Link>
            <Link
              href="/dashboard/calendar"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Calendar className="size-4" />
              Calendar
            </Link>
            <Link
              href="/dashboard/walk-ins"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Scissors className="size-4" />
              Walk-ins
            </Link>
            <Link
              href="/dashboard/staff"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Users className="size-4" />
              Staff Accounts
            </Link>
            <Link
              href="/dashboard/reports"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <BarChart3 className="size-4" />
              Revenue & Stats
            </Link>
            <Link
              href="/dashboard/services"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Scissors className="size-4" />
              Services & Pricing
            </Link>
            <Link
              href="/dashboard/availability"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <CalendarClock className="size-4" />
              Availability
            </Link>
            <Link
              href="/dashboard/setup"
              className="flex shrink-0 items-center gap-1.5 px-1 py-2.5 text-neutral-600 hover:text-navy-900"
            >
              <Settings className="size-4" />
              Shop Details
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Mobile Bottom Tab Bar (Plan: bottom tab bar on phones: Today, Bookings, Services, Shop, More) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed right-0 bottom-0 left-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200 bg-white/95 px-2 shadow-lg backdrop-blur-md sm:hidden"
      >
        <Link
          href="/dashboard"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold text-neutral-600 hover:text-navy-900"
        >
          <Clock className="size-5" />
          <span>Today</span>
        </Link>
        <Link
          href="/dashboard/inbox"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold text-neutral-600 hover:text-navy-900"
        >
          <Inbox className="size-5" />
          <span>Inbox</span>
        </Link>
        <Link
          href="/dashboard/calendar"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold text-neutral-600 hover:text-navy-900"
        >
          <Calendar className="size-5" />
          <span>Calendar</span>
        </Link>
        <Link
          href="/dashboard/walk-ins"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold text-neutral-600 hover:text-navy-900"
        >
          <Scissors className="size-5" />
          <span>Walk-ins</span>
        </Link>
        <Link
          href="/dashboard/reports"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-[10px] font-semibold text-neutral-600 hover:text-navy-900"
        >
          <BarChart3 className="size-5" />
          <span>Reports</span>
        </Link>
      </nav>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <p>© 2026 BooKanto. Designed for neighborhood shops in the Philippines.</p>
      </footer>
    </div>
  );
}
