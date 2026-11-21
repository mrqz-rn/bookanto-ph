import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AdminSidebar,
  AdminTopBar,
  type AdminNavUser,
} from "@/features/admin/components/admin-nav";
import { getAdminNavCounts } from "@/features/admin/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Console | BooKanto",
  description:
    "Platform administration: shop verification, categories, users, disputes, audit log, and fraud monitoring.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  // Admin access guard: user must have platform role of 'admin' or 'super_admin'
  if (user.platformRole !== "admin" && user.platformRole !== "super_admin") {
    redirect("/");
  }

  const navUser: AdminNavUser = {
    name: user.name,
    email: user.email,
    isSuperAdmin: user.platformRole === "super_admin",
  };
  const counts = await getAdminNavCounts();

  return (
    <div className="min-h-dvh bg-neutral-50 lg:flex">
      {/* From 1024px: every page in the sidebar. */}
      <AdminSidebar user={navUser} counts={counts} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* Below 1024px: the current page in a bar; the rest in a full-screen menu. */}
        <AdminTopBar user={navUser} counts={counts} />
        <main id="main" className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
