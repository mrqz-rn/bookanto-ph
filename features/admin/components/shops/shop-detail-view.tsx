"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  ExternalLink,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Store,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ShopStatus } from "@/lib/db/schema/enums";
import { formatCentavos } from "@/lib/money";
import { formatDate } from "@/lib/time";

import { rejectShop, suspendShop, unsuspendShop, verifyShop } from "../../actions";
import { SHOP_STATUS_COLORS } from "../../constants";

type ShopDetailProps = {
  shop: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    status: ShopStatus;
    verifiedAt: Date | null;
    ratingAvg: number;
    ratingCount: number;
    createdAt: Date;
    updatedAt: Date;
    cityName: string | null;
    barangayName: string | null;
    ownerId: string;
    ownerName: string | null;
    ownerEmail: string | null;
    ownerPhone: string | null;
    ownerStatus: string;
    categories: Array<{ id: string; name: string; slug: string; icon: string | null }>;
    services: Array<{
      id: string;
      name: string;
      priceType: string;
      priceCentavos: number | null;
      durationMin: number;
      bookingType: string;
      active: boolean;
    }>;
    businessHours: Array<{
      id: string;
      weekday: number;
      opens: string;
      closes: string;
      breakStart: string | null;
      breakEnd: string | null;
    }>;
    documents: Array<{ id: string; path: string; createdAt: Date }>;
    photos: Array<{ id: string; path: string; createdAt: Date }>;
    recentBookings: Array<{
      id: string;
      refCode: string;
      status: string;
      totalCentavos: number | null;
      startAt: Date;
      createdAt: Date;
      customerName: string | null;
    }>;
    auditLogs: Array<{
      id: string;
      action: string;
      data: Record<string, unknown> | null;
      createdAt: Date;
      actorName: string | null;
    }>;
  };
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function ShopDetailView({ shop }: ShopDetailProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = React.useState(false);

  // Reject / Suspend reason dialogs
  const [dialogMode, setDialogMode] = React.useState<"reject" | "suspend" | null>(null);
  const [actionReason, setActionReason] = React.useState("");

  const handleVerify = async () => {
    setLoadingAction(true);
    try {
      const res = await verifyShop({ shopId: shop.id });
      if (res.ok) router.refresh();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUnsuspend = async () => {
    setLoadingAction(true);
    try {
      const res = await unsuspendShop({ shopId: shop.id });
      if (res.ok) router.refresh();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReason.trim()) return;
    setLoadingAction(true);

    try {
      if (dialogMode === "reject") {
        const res = await rejectShop({ shopId: shop.id, reason: actionReason.trim() });
        if (res.ok) {
          setDialogMode(null);
          setActionReason("");
          router.refresh();
        }
      } else if (dialogMode === "suspend") {
        const res = await suspendShop({ shopId: shop.id, reason: actionReason.trim() });
        if (res.ok) {
          setDialogMode(null);
          setActionReason("");
          router.refresh();
        }
      }
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Back Navigation & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/shops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" /> Back to Shops Directory
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {shop.status === "pending" && (
            <>
              <Button
                size="sm"
                disabled={loadingAction}
                onClick={handleVerify}
                className="bg-emerald-700 text-xs text-white hover:bg-emerald-800"
              >
                <CheckCircle className="mr-1.5 size-4" /> Approve & Verify Shop
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loadingAction}
                onClick={() => setDialogMode("reject")}
                className="border-rose-300 text-xs text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="mr-1.5 size-4" /> Reject Verification
              </Button>
            </>
          )}

          {shop.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              disabled={loadingAction}
              onClick={() => setDialogMode("suspend")}
              className="border-neutral-300 text-xs text-neutral-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <Ban className="mr-1.5 size-4" /> Suspend Shop
            </Button>
          )}

          {shop.status === "suspended" && (
            <Button
              size="sm"
              disabled={loadingAction}
              onClick={handleUnsuspend}
              className="bg-emerald-700 text-xs text-white hover:bg-emerald-800"
            >
              <ShieldCheck className="mr-1.5 size-4" /> Unsuspend Shop
            </Button>
          )}

          <Button asChild size="sm" variant="ghost" className="text-xs">
            <Link href={`/shop/${shop.slug}`} target="_blank">
              View Public Page <ExternalLink className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Store className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-neutral-900">{shop.name}</h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                    SHOP_STATUS_COLORS[shop.status]
                  }`}
                >
                  {shop.status}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-neutral-500">
                slug: /shop/{shop.slug} • ID: {shop.id}
              </p>

              {shop.description && (
                <p className="mt-2 max-w-2xl text-xs text-neutral-700">{shop.description}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-600">
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-neutral-900">{shop.ratingAvg}</span> (
                  {shop.ratingCount} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-neutral-400" />
                  {shop.address || "No address"}, {shop.barangayName}, {shop.cityName}
                </span>
                {shop.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="size-3.5 text-neutral-400" />
                    {shop.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-neutral-500">
            <p>Created: {formatDate(shop.createdAt)}</p>
            {shop.verifiedAt && (
              <p className="font-semibold text-emerald-700">
                Verified: {formatDate(shop.verifiedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Categories Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3">
          <span className="mr-1 text-xs font-semibold text-neutral-500">Categories:</span>
          {shop.categories.map((cat) => (
            <span
              key={cat.id}
              className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800"
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Grid: Verification Documents & Merchant Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Verification Documents */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="font-bold text-neutral-900">Verification Documents</h3>
              <p className="text-xs text-neutral-500">
                Business permit, DTI/SEC registration, government ID
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">
              {shop.documents.length} {shop.documents.length === 1 ? "document" : "documents"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {shop.documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500">
                <FileText className="mx-auto mb-2 size-8 text-neutral-300" />
                No verification documents uploaded yet.
              </div>
            ) : (
              shop.documents.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">Document #{idx + 1}</p>
                      <p className="max-w-xs truncate font-mono text-[11px] text-neutral-500">
                        {doc.path}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/api/admin/documents/${doc.id}`} target="_blank">
                      View File <ExternalLink className="ml-1 size-3" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Merchant / Owner Account */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="font-bold text-neutral-900">Shop Owner Account</h3>
              <p className="text-xs text-neutral-500">Account holder responsible for this shop</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                shop.ownerStatus === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {shop.ownerStatus}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-700">
                <User className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {shop.ownerName || "Unnamed User"}
                </p>
                <p className="text-neutral-500">{shop.ownerEmail || "No email"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-2">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Owner ID</span>
                <p className="font-mono text-[11px] text-neutral-700">{shop.ownerId}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Phone</span>
                <p className="font-mono text-neutral-900">{shop.ownerPhone || "Not set"}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <Link href={`/admin/users/${shop.ownerId}`}>
                  View Full User Record <ExternalLink className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Services and Hours */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Services List */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <h3 className="mb-3 font-bold text-neutral-900">
            Services & Pricing ({shop.services.length})
          </h3>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {shop.services.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No services listed.</p>
            ) : (
              shop.services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 text-xs"
                >
                  <div>
                    <span className="font-bold text-neutral-900">{s.name}</span>
                    <p className="text-[11px] text-neutral-500 capitalize">
                      {s.durationMin} mins • Type: {s.bookingType}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-neutral-900">
                      {s.priceCentavos ? formatCentavos(s.priceCentavos) : "Quote"}
                    </span>
                    <span className="block text-[10px] text-neutral-400 capitalize">
                      {s.priceType}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operating Hours */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
          <h3 className="mb-3 font-bold text-neutral-900">Operating Hours</h3>
          <div className="space-y-1.5 text-xs">
            {WEEKDAY_NAMES.map((dayName, idx) => {
              const h = shop.businessHours.find((item) => item.weekday === idx);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-neutral-100 py-1 last:border-none"
                >
                  <span className="font-semibold text-neutral-800">{dayName}</span>
                  {h ? (
                    <span className="font-mono text-neutral-600">
                      {h.opens.slice(0, 5)} - {h.closes.slice(0, 5)}
                      {h.breakStart && (
                        <span className="ml-1 text-[10px] text-neutral-400">
                          (Break: {h.breakStart.slice(0, 5)}-{h.breakEnd?.slice(0, 5)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-neutral-400">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reason Dialog Modal for Reject / Suspend */}
      {dialogMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-neutral-900">
              {dialogMode === "reject" ? "Reject Shop Verification" : "Suspend Shop"}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              {dialogMode === "reject"
                ? "Please explain why verification is rejected. The merchant will be notified."
                : "Please explain the reason for suspension. This will be recorded in the audit log."}
            </p>
            <form onSubmit={handleReasonSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Reason</label>
                <Textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter detailed reason..."
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDialogMode(null);
                    setActionReason("");
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loadingAction || !actionReason.trim()}
                  className="bg-rose-700 text-xs text-white hover:bg-rose-800"
                >
                  {loadingAction ? "Processing..." : "Confirm Action"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
