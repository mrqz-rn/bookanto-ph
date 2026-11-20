import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  DashboardContentSlot,
  DashboardMobileNav,
  DashboardNavProvider,
  DashboardSidebar,
  DashboardTopBar,
  type DashboardShop,
} from "@/features/shops/components/dashboard-nav";
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
  const current = shops[0];
  const shop: DashboardShop = current
    ? { name: current.name, status: current.status, slug: current.slug ?? null }
    : null;

  return (
    <DashboardNavProvider>
      <div className="min-h-dvh bg-neutral-50 lg:flex">
        {/* From 1024px: every page in the sidebar. */}
        <DashboardSidebar shop={shop} />

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          {/* Below 1024px: logo, shop and account on top; the pages in the bottom bar. */}
          <DashboardTopBar shop={shop} />

          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="max-w-8xl">
              <DashboardContentSlot>{children}</DashboardContentSlot>
            </div>
          </main>

          <footer className="border-t border-neutral-200 px-4 py-5 text-center text-xs text-neutral-600 sm:px-6 lg:px-10">
            © 2026 BooKanto. Designed for neighborhood shops in the Philippines.
          </footer>
        </div>

        <DashboardMobileNav shop={shop} />
      </div>
    </DashboardNavProvider>
  );
}
