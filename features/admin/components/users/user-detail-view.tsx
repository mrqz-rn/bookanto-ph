"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft, Ban, CheckCircle, Shield, ShieldAlert } from "lucide-react";

import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { BookingStatus, PlatformRole, UserStatus } from "@/lib/db/schema/enums";
import { formatCentavos } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";

import { suspendUser, unsuspendUser, updateUserRole } from "../../actions";
import { FRAUD_SEVERITY_COLORS, PLATFORM_ROLE_COLORS } from "../../constants";

type UserDetailProps = {
  user: {
    id: string;
    authId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    platformRole: PlatformRole;
    status: UserStatus;
    createdAt: Date;
    addresses: Array<{
      id: string;
      label: string;
      streetAddress: string;
      notes: string | null;
      isDefault: boolean;
    }>;
    shops: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
    }>;
    recentBookings: Array<{
      id: string;
      refCode: string;
      status: string;
      totalCentavos: number | null;
      startAt: Date;
      createdAt: Date;
      shopName: string;
      serviceName: string;
    }>;
    auditLogs: Array<{
      id: string;
      action: string;
      data: Record<string, unknown> | null;
      createdAt: Date;
      actorName: string | null;
    }>;
    fraudSignals: Array<{
      id: string;
      signalType: string;
      severity: string;
      status: string;
      score: number;
      createdAt: Date;
    }>;
  };
  isSuperAdmin: boolean;
};

export function UserDetailView({ user, isSuperAdmin }: UserDetailProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  // Suspend dialog
  const [suspendDialogOpen, setSuspendDialogOpen] = React.useState(false);
  const [suspendReason, setSuspendReason] = React.useState("");

  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<PlatformRole>(user.platformRole);

  const handleUnsuspend = async () => {
    setBusy(true);
    try {
      const res = await unsuspendUser({ userId: user.id });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) return;
    setBusy(true);
    try {
      const res = await suspendUser({ userId: user.id, reason: suspendReason.trim() });
      if (res.ok) {
        setSuspendDialogOpen(false);
        setSuspendReason("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await updateUserRole({ userId: user.id, role: newRole });
      if (res.ok) {
        setRoleDialogOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" /> Back to Users Directory
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {user.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || user.platformRole === "super_admin"}
              onClick={() => setSuspendDialogOpen(true)}
              className="border-neutral-300 text-xs text-neutral-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <Ban className="mr-1.5 size-3.5" /> Suspend User
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={handleUnsuspend}
              className="bg-emerald-700 text-xs text-white hover:bg-emerald-800"
            >
              <CheckCircle className="mr-1.5 size-3.5" /> Unsuspend Account
            </Button>
          )}

          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRoleDialogOpen(true)}
              className="border-purple-300 text-xs text-purple-700 hover:bg-purple-50"
            >
              <Shield className="mr-1.5 size-3.5" /> Change Role
            </Button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-lg font-bold text-neutral-700">
            {user.name ? user.name[0]?.toUpperCase() : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-neutral-900">
                {user.name || "Unnamed User"}
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                  PLATFORM_ROLE_COLORS[user.platformRole]
                }`}
              >
                {user.platformRole.replace("_", " ")}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                  user.status === "active"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {user.status}
              </span>
            </div>

            <p className="mt-1 font-mono text-xs text-neutral-500">ID: {user.id}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-600">
              {user.email && <span>Email: {user.email}</span>}
              {user.phone && <span className="font-mono">Phone: {user.phone}</span>}
              <span>Joined: {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Signals Alert Banner if flagged */}
      {user.fraudSignals.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-950">
            <ShieldAlert className="size-5 text-rose-600" />
            <span>Fraud Risk Signals ({user.fraudSignals.length})</span>
          </div>
          <div className="mt-3 space-y-2">
            {user.fraudSignals.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between rounded-lg border border-rose-200 bg-white p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      FRAUD_SEVERITY_COLORS[sig.severity as keyof typeof FRAUD_SEVERITY_COLORS] ??
                      FRAUD_SEVERITY_COLORS.low
                    }`}
                  >
                    {sig.severity} (Score: {sig.score})
                  </span>
                  <span className="font-bold text-neutral-900 capitalize">
                    {sig.signalType.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="font-bold text-rose-700 capitalize">{sig.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owned Shops & Saved Addresses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Owned Shops */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <h3 className="mb-3 font-bold text-neutral-900">Owned Shops ({user.shops.length})</h3>
          <div className="space-y-2">
            {user.shops.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">This user does not own any shops.</p>
            ) : (
              user.shops.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-neutral-900">{s.name}</span>
                    <p className="font-mono text-[11px] text-neutral-500">/shop/{s.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 capitalize">
                      {s.status}
                    </span>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/admin/shops/${s.id}`}>Manage</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <h3 className="mb-3 font-bold text-neutral-900">
            Saved Addresses ({user.addresses.length})
          </h3>
          <div className="space-y-2">
            {user.addresses.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No saved addresses on file.</p>
            ) : (
              user.addresses.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-neutral-900">
                    <span>{a.label}</span>
                    {a.isDefault && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-neutral-700">{a.streetAddress}</p>
                  {a.notes && (
                    <p className="text-[11px] text-neutral-500 italic">Note: {a.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
        <h3 className="mb-3 font-bold text-neutral-900">
          Recent Bookings as Customer ({user.recentBookings.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase">
              <tr>
                <th className="py-2">Ref Code</th>
                <th className="py-2">Shop</th>
                <th className="py-2">Service</th>
                <th className="py-2">Schedule</th>
                <th className="py-2">Total</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {user.recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500">
                    No bookings placed yet.
                  </td>
                </tr>
              ) : (
                user.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 font-mono font-bold text-neutral-900">#{b.refCode}</td>
                    <td className="py-2.5 font-semibold text-neutral-900">{b.shopName}</td>
                    <td className="py-2.5 text-neutral-700">{b.serviceName}</td>
                    <td className="py-2.5 text-neutral-600">{formatDateTime(b.startAt)}</td>
                    <td className="py-2.5 font-mono font-bold text-neutral-900">
                      {b.totalCentavos ? formatCentavos(b.totalCentavos) : "Quote"}
                    </td>
                    <td className="py-2.5">
                      <BookingStatusBadge status={b.status as BookingStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend User Dialog */}
      {suspendDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">Suspend User Account</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Please enter the reason for suspending this user account.
            </p>
            <form onSubmit={handleSuspendSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Reason</label>
                <Textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Enter suspension reason..."
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendDialogOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !suspendReason.trim()}
                  className="bg-rose-700 text-xs text-white hover:bg-rose-800"
                >
                  {busy ? "Suspending..." : "Confirm Suspension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Dialog */}
      {roleDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">Change Platform Role</h3>
            <form onSubmit={handleRoleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Platform Role</label>
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
                  onClick={() => setRoleDialogOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy}
                  className="bg-purple-700 text-xs text-white hover:bg-purple-800"
                >
                  {busy ? "Updating..." : "Save Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
