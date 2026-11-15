"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Ban, CheckCircle, Search, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlatformRole, UserStatus } from "@/lib/db/schema/enums";
import { formatDate } from "@/lib/time";

import { suspendUser, unsuspendUser, updateUserRole } from "../../actions";
import { PLATFORM_ROLE_COLORS } from "../../constants";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  platformRole: PlatformRole;
  status: UserStatus;
  createdAt: Date;
  bookingsCount: number;
  ownedShops: string[];
};

type UsersTableProps = {
  users: UserItem[];
  total: number;
  isSuperAdmin: boolean;
  currentRole?: PlatformRole;
  currentStatus?: UserStatus;
  currentSearch?: string;
};

export function UsersTable({
  users: initialUsers,
  isSuperAdmin,
  currentRole,
  currentStatus,
  currentSearch = "",
}: UsersTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(currentSearch);
  const [role, setRole] = React.useState<PlatformRole | "all">(currentRole ?? "all");
  const [status, setStatus] = React.useState<UserStatus | "all">(currentStatus ?? "all");
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);

  // Dialogs
  const [suspendDialog, setSuspendDialog] = React.useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({ isOpen: false, userId: "", userName: "" });
  const [suspendReason, setSuspendReason] = React.useState("");

  const [roleDialog, setRoleDialog] = React.useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    currentRole: PlatformRole;
  }>({ isOpen: false, userId: "", userName: "", currentRole: "customer" });
  const [newRole, setNewRole] = React.useState<PlatformRole>("customer");

  const updateFilters = (r: PlatformRole | "all", s: UserStatus | "all", searchQuery: string) => {
    const params = new URLSearchParams();
    if (r !== "all") params.set("role", r);
    if (s !== "all") params.set("status", s);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(role, status, search);
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) return;
    setBusyUserId(suspendDialog.userId);
    try {
      const res = await suspendUser({
        userId: suspendDialog.userId,
        reason: suspendReason.trim(),
      });
      if (res.ok) {
        setSuspendDialog({ isOpen: false, userId: "", userName: "" });
        setSuspendReason("");
        router.refresh();
      }
    } finally {
      setBusyUserId(null);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    setBusyUserId(userId);
    try {
      const res = await unsuspendUser({ userId });
      if (res.ok) router.refresh();
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyUserId(roleDialog.userId);
    try {
      const res = await updateUserRole({
        userId: roleDialog.userId,
        role: newRole,
      });
      if (res.ok) {
        setRoleDialog({ isOpen: false, userId: "", userName: "", currentRole: "customer" });
        router.refresh();
      }
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={role}
            onChange={(e) => {
              const r = e.target.value as PlatformRole | "all";
              setRole(r);
              updateFilters(r, status, search);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              const s = e.target.value as UserStatus | "all";
              setStatus(s);
              updateFilters(role, s, search);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 size-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Shops Owned</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {initialUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                initialUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-neutral-50/50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                          {user.name ? user.name[0]?.toUpperCase() : "U"}
                        </div>
                        <div>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="font-bold text-neutral-900 hover:text-green-700"
                          >
                            {user.name || "Unnamed User"}
                          </Link>
                          <p className="text-[11px] text-neutral-500">{user.email || "No email"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-700">
                      {user.phone || "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                          PLATFORM_ROLE_COLORS[user.platformRole]
                        }`}
                      >
                        {user.platformRole.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          user.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-neutral-700">
                      {user.bookingsCount}
                    </td>

                    <td className="px-4 py-3.5">
                      {user.ownedShops.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {user.ownedShops.map((name, i) => (
                            <span
                              key={i}
                              className="max-w-[180px] truncate text-xs font-semibold text-neutral-900"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-neutral-500">{formatDate(user.createdAt)}</td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyUserId === user.id || user.platformRole === "super_admin"}
                            onClick={() =>
                              setSuspendDialog({
                                isOpen: true,
                                userId: user.id,
                                userName: user.name || user.email || "User",
                              })
                            }
                            className="h-7 border-neutral-300 px-2 text-[11px] text-neutral-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Ban className="mr-1 size-3" /> Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyUserId === user.id}
                            onClick={() => handleUnsuspend(user.id)}
                            className="h-7 border-emerald-300 px-2 text-[11px] text-emerald-800 hover:bg-emerald-50"
                          >
                            <CheckCircle className="mr-1 size-3" /> Unsuspend
                          </Button>
                        )}

                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRoleDialog({
                                isOpen: true,
                                userId: user.id,
                                userName: user.name || user.email || "User",
                                currentRole: user.platformRole,
                              });
                              setNewRole(user.platformRole);
                            }}
                            className="h-7 px-2 text-purple-700 hover:bg-purple-50"
                          >
                            <Shield className="size-3.5" />
                          </Button>
                        )}

                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-neutral-600"
                        >
                          <Link href={`/admin/users/${user.id}`}>
                            <User className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend User Dialog */}
      {suspendDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">Suspend User Account</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Suspended users can only browse public pages and cannot log in, book services, or
              manage shops.
            </p>
            <form onSubmit={handleSuspendSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700">
                  Reason for Suspension
                </label>
                <Textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Terms violation, fraudulent chargeback, or abusive messaging."
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendDialog({ isOpen: false, userId: "", userName: "" })}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busyUserId === suspendDialog.userId || !suspendReason.trim()}
                  className="bg-rose-700 text-xs text-white hover:bg-rose-800"
                >
                  {busyUserId === suspendDialog.userId ? "Suspending..." : "Confirm Suspension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Update Dialog (Super Admin) */}
      {roleDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">Change Platform Role</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Grant administrator or super administrator platform permissions for &ldquo;
              {roleDialog.userName}&rdquo;.
            </p>
            <form onSubmit={handleRoleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700">
                  Select Platform Role
                </label>
                <div className="mt-2 space-y-2">
                  {(["customer", "admin", "super_admin"] as const).map((r) => (
                    <label
                      key={r}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        newRole === r ? "border-purple-600 bg-purple-50/40" : "border-neutral-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={newRole === r}
                        onChange={() => setNewRole(r)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-neutral-900 capitalize">
                          {r.replace("_", " ")}
                        </span>
                        <p className="text-[11px] text-neutral-500">
                          {r === "super_admin"
                            ? "Full platform access: manage admins, audit log, platform settings."
                            : r === "admin"
                              ? "Can verify/suspend shops, resolve disputes, manage categories."
                              : "Standard customer / merchant account."}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-neutral-100 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRoleDialog({
                      isOpen: false,
                      userId: "",
                      userName: "",
                      currentRole: "customer",
                    })
                  }
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busyUserId === roleDialog.userId}
                  className="bg-purple-700 text-xs text-white hover:bg-purple-800"
                >
                  {busyUserId === roleDialog.userId ? "Saving..." : "Update Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
