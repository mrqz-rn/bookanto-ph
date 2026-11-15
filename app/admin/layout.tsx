import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminHeader } from "@/features/admin/components/admin-header";
import { AdminNav } from "@/features/admin/components/admin-nav";
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
  const isPlatformAdmin = user.platformRole === "admin" || user.platformRole === "super_admin";

  if (!isPlatformAdmin) {
    redirect("/");
  }

  const isSuperAdmin = user.platformRole === "super_admin";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-16">
      <AdminHeader
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          platformRole: user.platformRole,
        }}
      />
      <AdminNav isSuperAdmin={isSuperAdmin} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
