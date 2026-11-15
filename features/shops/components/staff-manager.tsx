"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Loader2,
  Phone,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { removeStaffMember, toggleStaffActive, updateStaffRole } from "../actions";
import type { ShopTeamMember } from "../queries";
import { AddStaffModal } from "./add-staff-modal";

type StaffManagerProps = {
  shopId: string;
  members: ShopTeamMember[];
  canManage: boolean;
};

export function StaffManager({ shopId, members, canManage }: StaffManagerProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [loadingMemberId, setLoadingMemberId] = React.useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = React.useState<ShopTeamMember | null>(null);

  const handleToggleActive = async (member: ShopTeamMember) => {
    setLoadingMemberId(member.userId);
    const res = await toggleStaffActive({
      shopId,
      userId: member.userId,
      active: !member.active,
    });
    setLoadingMemberId(null);
    if (res.ok) router.refresh();
  };

  const handleRoleChange = async (member: ShopTeamMember, newRole: "manager" | "staff") => {
    setLoadingMemberId(member.userId);
    const res = await updateStaffRole({
      shopId,
      userId: member.userId,
      role: newRole,
    });
    setLoadingMemberId(null);
    if (res.ok) router.refresh();
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setLoadingMemberId(memberToRemove.userId);
    const res = await removeStaffMember({
      shopId,
      userId: memberToRemove.userId,
    });
    setLoadingMemberId(null);
    setMemberToRemove(null);
    if (res.ok) router.refresh();
  };

  const activeMembersCount = members.filter((m) => m.active).length;
  const totalAssignedBookings = members.reduce((sum, m) => sum + m.assignedCount, 0);
  const totalTeamRevenue = members.reduce((sum, m) => sum + m.grossCentavos, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Team & Staff Accounts
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Manage your shop&apos;s owners, managers, and service staff members.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="bg-green-600 text-xs font-bold text-white shadow-xs hover:bg-green-500"
          >
            <UserPlus className="mr-1.5 size-4" />+ Add Team Member
          </Button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Users className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Total Team
          </p>
          <p className="font-display text-2xl font-bold text-neutral-900">{members.length}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <UserCheck className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Active Members
          </p>
          <p className="font-display text-2xl font-bold text-emerald-700">{activeMembersCount}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <CheckCircle2 className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Bookings Handled
          </p>
          <p className="font-display text-2xl font-bold text-purple-700">{totalAssignedBookings}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <DollarSign className="size-4" />
          </div>
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Revenue Generated
          </p>
          <p className="font-display text-2xl font-bold text-neutral-900">
            {formatPeso(totalTeamRevenue)}
          </p>
        </div>
      </div>

      {/* Team Members List */}
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isLoading = loadingMemberId === member.userId;

          return (
            <div
              key={member.id}
              className="flex flex-col gap-4 p-5 transition-colors hover:bg-neutral-50/50 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Member Info */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-bold ${
                    isOwner
                      ? "bg-orange-100 text-orange-800"
                      : member.role === "manager"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-neutral-900">
                      {member.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        isOwner
                          ? "border border-orange-200 bg-orange-100 text-orange-800"
                          : member.role === "manager"
                            ? "border border-purple-200 bg-purple-100 text-purple-800"
                            : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {member.role}
                    </span>
                    {!member.active && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {member.phone}
                      </span>
                    )}
                    {member.email && <span>{member.email}</span>}
                  </div>

                  {/* Performance stats mini pill */}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                      {member.assignedCount} {member.assignedCount === 1 ? "booking" : "bookings"}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      {formatPeso(member.grossCentavos)} completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {/* Schedule Link */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-neutral-700"
                >
                  <Link href="/dashboard/availability">
                    <CalendarClock className="mr-1.5 size-3.5" />
                    Hours & Leave
                  </Link>
                </Button>

                {/* Role Switcher (Not for Owner) */}
                {canManage && !isOwner && (
                  <select
                    disabled={isLoading}
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member, e.target.value as "manager" | "staff")
                    }
                    className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-xs text-neutral-800 outline-none"
                  >
                    <option value="staff">Role: Staff</option>
                    <option value="manager">Role: Manager</option>
                  </select>
                )}

                {/* Active / Inactive Toggle */}
                {canManage && !isOwner && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleToggleActive(member)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      member.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : member.active ? (
                      "Active"
                    ) : (
                      "Inactive"
                    )}
                  </button>
                )}

                {/* Remove button */}
                {canManage && !isOwner && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setMemberToRemove(member)}
                    className="p-1.5 text-neutral-400 transition-colors hover:text-rose-600"
                    title="Remove from team"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddStaffModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        shopId={shopId}
        onSuccess={() => router.refresh()}
      />

      {/* Remove Confirmation Modal */}
      {memberToRemove && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-neutral-900">
              Remove Team Member?
            </h3>
            <p className="text-xs text-neutral-600">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-neutral-900">{memberToRemove.name}</span> from
              your shop? They will lose access to the shop dashboard and will no longer be assigned
              bookings.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemberToRemove(null)}
                disabled={loadingMemberId === memberToRemove.userId}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmRemove}
                disabled={loadingMemberId === memberToRemove.userId}
                className="bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
              >
                {loadingMemberId === memberToRemove.userId && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Remove Member
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
