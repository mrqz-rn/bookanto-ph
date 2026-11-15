import type { Metadata } from "next";

import { UsersTable } from "@/features/admin/components/users/users-table";
import { getAdminUsers } from "@/features/admin/queries";
import { getCurrentUser } from "@/lib/auth";
import type { PlatformRole, UserStatus } from "@/lib/db/schema/enums";

export const metadata: Metadata = {
  title: "User Management | BooKanto Admin",
};

type AdminUsersPageProps = {
  searchParams: Promise<{
    role?: string;
    status?: string;
    q?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { role, status, q } = await searchParams;
  const currentUser = await getCurrentUser();

  const validRole =
    role && ["customer", "admin", "super_admin"].includes(role)
      ? (role as PlatformRole)
      : undefined;

  const validStatus =
    status && ["active", "suspended"].includes(status) ? (status as UserStatus) : undefined;

  const { users, total } = await getAdminUsers({
    role: validRole,
    status: validStatus,
    search: q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900">User Management</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Search customer and staff accounts, oversee booking activity, and manage account statuses.
        </p>
      </div>

      <UsersTable
        users={users}
        total={total}
        isSuperAdmin={currentUser?.platformRole === "super_admin"}
        currentRole={validRole}
        currentStatus={validStatus}
        currentSearch={q ?? ""}
      />
    </div>
  );
}
