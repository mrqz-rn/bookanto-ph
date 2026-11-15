"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Ban, CheckCircle, Eye, FileText, Search, ShieldCheck, Store, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ShopStatus } from "@/lib/db/schema/enums";
import { formatDate } from "@/lib/time";

import { rejectShop, suspendShop, unsuspendShop, verifyShop } from "../../actions";
import { SHOP_STATUS_COLORS } from "../../constants";

type ShopItem = {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  phone: string | null;
  ratingAvg: number;
  ratingCount: number;
  verifiedAt: Date | null;
  createdAt: Date;
  cityName: string | null;
  barangayName: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  documentsCount: number;
};

type ShopApprovalTableProps = {
  initialShops: ShopItem[];
  total: number;
  currentStatus?: ShopStatus;
  currentSearch?: string;
};

export function ShopApprovalTable({
  initialShops,
  currentStatus,
  currentSearch = "",
}: ShopApprovalTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(currentSearch);
  const [selectedStatus, setSelectedStatus] = React.useState<ShopStatus | "all">(
    currentStatus ?? "all",
  );
  const [busyShopId, setBusyShopId] = React.useState<string | null>(null);

  // Dialog states for Reason Prompts
  const [rejectDialog, setRejectDialog] = React.useState<{
    isOpen: boolean;
    shopId: string;
    shopName: string;
  }>({ isOpen: false, shopId: "", shopName: "" });
  const [rejectReason, setRejectReason] = React.useState("");

  const [suspendDialog, setSuspendDialog] = React.useState<{
    isOpen: boolean;
    shopId: string;
    shopName: string;
  }>({ isOpen: false, shopId: "", shopName: "" });
  const [suspendReason, setSuspendReason] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(selectedStatus, search);
  };

  const updateFilters = (status: ShopStatus | "all", searchQuery: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/admin/shops?${params.toString()}`);
  };

  const handleVerify = async (shopId: string) => {
    setBusyShopId(shopId);
    try {
      const res = await verifyShop({ shopId });
      if (res.ok) router.refresh();
    } finally {
      setBusyShopId(null);
    }
  };

  const handleUnsuspend = async (shopId: string) => {
    setBusyShopId(shopId);
    try {
      const res = await unsuspendShop({ shopId });
      if (res.ok) router.refresh();
    } finally {
      setBusyShopId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    setBusyShopId(rejectDialog.shopId);
    try {
      const res = await rejectShop({
        shopId: rejectDialog.shopId,
        reason: rejectReason.trim(),
      });
      if (res.ok) {
        setRejectDialog({ isOpen: false, shopId: "", shopName: "" });
        setRejectReason("");
        router.refresh();
      }
    } finally {
      setBusyShopId(null);
    }
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) return;
    setBusyShopId(suspendDialog.shopId);
    try {
      const res = await suspendShop({
        shopId: suspendDialog.shopId,
        reason: suspendReason.trim(),
      });
      if (res.ok) {
        setSuspendDialog({ isOpen: false, shopId: "", shopName: "" });
        setSuspendReason("");
        router.refresh();
      }
    } finally {
      setBusyShopId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-1 text-xs font-semibold text-neutral-700">
          {(["all", "pending", "active", "suspended", "draft"] as const).map((status) => {
            const isTabActive = selectedStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setSelectedStatus(status);
                  updateFilters(status, search);
                }}
                className={`rounded-md px-3 py-1.5 capitalize transition-colors ${
                  isTabActive
                    ? "bg-white font-bold text-neutral-900 shadow-2xs"
                    : "text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 size-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search shop, phone, owner..."
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

      {/* Shops Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {initialShops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No shops match the selected status or query.
                  </td>
                </tr>
              ) : (
                initialShops.map((shop) => (
                  <tr key={shop.id} className="transition-colors hover:bg-neutral-50/50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 font-bold text-orange-700">
                          <Store className="size-4" />
                        </div>
                        <div>
                          <Link
                            href={`/admin/shops/${shop.id}`}
                            className="font-bold text-neutral-900 hover:text-green-700"
                          >
                            {shop.name}
                          </Link>
                          <p className="font-mono text-[11px] text-neutral-500">/{shop.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-neutral-900">
                        {shop.ownerName || "No name"}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {shop.ownerPhone || shop.ownerEmail || "No contact"}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-neutral-900">{shop.cityName || "N/A"}</p>
                      <p className="text-[11px] text-neutral-500">{shop.barangayName || ""}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                          SHOP_STATUS_COLORS[shop.status]
                        }`}
                      >
                        {shop.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 font-semibold text-neutral-700">
                        <FileText className="size-3.5 text-neutral-400" />
                        {shop.documentsCount} {shop.documentsCount === 1 ? "doc" : "docs"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-neutral-500">{formatDate(shop.createdAt)}</td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {shop.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              disabled={busyShopId === shop.id}
                              onClick={() => handleVerify(shop.id)}
                              className="h-7 bg-emerald-700 px-2.5 text-[11px] text-white hover:bg-emerald-800"
                            >
                              <CheckCircle className="mr-1 size-3" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyShopId === shop.id}
                              onClick={() =>
                                setRejectDialog({
                                  isOpen: true,
                                  shopId: shop.id,
                                  shopName: shop.name,
                                })
                              }
                              className="h-7 border-rose-200 px-2 text-[11px] text-rose-700 hover:bg-rose-50"
                            >
                              <XCircle className="mr-1 size-3" /> Reject
                            </Button>
                          </>
                        )}

                        {shop.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyShopId === shop.id}
                            onClick={() =>
                              setSuspendDialog({
                                isOpen: true,
                                shopId: shop.id,
                                shopName: shop.name,
                              })
                            }
                            className="h-7 border-neutral-300 px-2 text-[11px] text-neutral-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Ban className="mr-1 size-3" /> Suspend
                          </Button>
                        )}

                        {shop.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyShopId === shop.id}
                            onClick={() => handleUnsuspend(shop.id)}
                            className="h-7 border-emerald-300 px-2 text-[11px] text-emerald-800 hover:bg-emerald-50"
                          >
                            <ShieldCheck className="mr-1 size-3" /> Unsuspend
                          </Button>
                        )}

                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-neutral-600"
                        >
                          <Link href={`/admin/shops/${shop.id}`}>
                            <Eye className="size-3.5" />
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

      {/* Reject Reason Dialog */}
      {rejectDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">Reject Shop Verification</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Rejecting &ldquo;{rejectDialog.shopName}&rdquo; will revert its status back to draft
              and notify the merchant.
            </p>
            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Rejection Reason</label>
                <Textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Uploaded business permit is expired or blurry. Please upload a clear copy."
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectDialog({ isOpen: false, shopId: "", shopName: "" })}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busyShopId === rejectDialog.shopId || !rejectReason.trim()}
                  className="bg-rose-700 text-xs text-white hover:bg-rose-800"
                >
                  {busyShopId === rejectDialog.shopId ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Reason Dialog */}
      {suspendDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">Suspend Shop</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Suspending &ldquo;{suspendDialog.shopName}&rdquo; removes it from public discovery and
              blocks new bookings.
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
                  placeholder="e.g. Unresolved fraudulent transactions or multiple consumer complaints."
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendDialog({ isOpen: false, shopId: "", shopName: "" })}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busyShopId === suspendDialog.shopId || !suspendReason.trim()}
                  className="bg-rose-700 text-xs text-white hover:bg-rose-800"
                >
                  {busyShopId === suspendDialog.shopId ? "Suspending..." : "Confirm Suspension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
