import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  Scissors,
  Settings,
  Store,
  User,
} from "lucide-react";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { getUserShops } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shop Dashboard | BooKanto",
  description: "Manage your shop, services, bookings, and business hours.",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const shops = await getUserShops();
  const currentShop = shops[0] || null;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
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

        {/* Secondary Sub-nav for Dashboard links */}
        <div className="border-t border-neutral-100 bg-neutral-50/80 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl space-x-6 overflow-x-auto text-xs font-semibold">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 py-3 text-neutral-600 hover:text-navy-900"
            >
              <LayoutDashboard className="size-4" />
              Overview
            </Link>
            <Link
              href="/dashboard/services"
              className="flex items-center gap-1.5 py-3 text-neutral-600 hover:text-navy-900"
            >
              <Scissors className="size-4" />
              Services & Pricing
            </Link>
            <Link
              href="/dashboard/availability"
              className="flex items-center gap-1.5 py-3 text-neutral-600 hover:text-navy-900"
            >
              <CalendarClock className="size-4" />
              Availability
            </Link>
            <Link
              href="/dashboard/setup"
              className="flex items-center gap-1.5 py-3 text-neutral-600 hover:text-navy-900"
            >
              <Settings className="size-4" />
              Shop Onboarding & Details
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <p>© 2026 BooKanto. Designed for neighborhood shops in the Philippines.</p>
      </footer>
    </div>
  );
}
