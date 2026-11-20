"use client";

import * as React from "react";
import {
  Briefcase,
  Building,
  Building2,
  Check,
  Home,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  StickyNote,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteSavedAddress, setDefaultAddress } from "@/features/account/actions";
import { MAX_SAVED_ADDRESSES } from "@/features/account/constants";
import type { CityOption, SavedAddressItem } from "@/features/account/queries";
import { formatPhone } from "@/lib/phone";
import { AddressModal } from "./address-modal";

type AddressListProps = {
  addresses: SavedAddressItem[];
  cities: CityOption[];
};

type Status = { type: "success" | "error"; text: string } | null;

const LABEL_ICONS: Record<string, LucideIcon> = {
  home: Home,
  work: Briefcase,
  office: Building2,
  condo: Building,
};

function labelIcon(label: string): LucideIcon {
  return LABEL_ICONS[label.trim().toLowerCase()] ?? MapPin;
}

export function AddressList({ addresses, cities }: AddressListProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<SavedAddressItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>(null);

  const count = addresses.length;
  const atLimit = count >= MAX_SAVED_ADDRESSES;
  const slotsLeft = Math.max(0, MAX_SAVED_ADDRESSES - count);

  const handleSetDefault = async (id: string) => {
    setActionLoadingId(id);
    setStatus(null);
    try {
      const result = await setDefaultAddress({ id });
      setStatus(
        result.ok
          ? { type: "success", text: "Default address updated." }
          : { type: "error", text: result.message },
      );
    } catch {
      setStatus({ type: "error", text: "We couldn't change your default address. Try again." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoadingId(id);
    setStatus(null);
    try {
      const result = await deleteSavedAddress({ id });
      if (result.ok) {
        setConfirmDeleteId(null);
        setStatus({ type: "success", text: "Address deleted." });
      } else {
        setStatus({ type: "error", text: result.message });
      }
    } catch {
      setStatus({ type: "error", text: "We couldn't delete that address. Try again." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openAdd = () => {
    if (atLimit) return;
    setEditingAddress(null);
    setStatus(null);
    setModalOpen(true);
  };

  const openEdit = (address: SavedAddressItem) => {
    setEditingAddress(address);
    setConfirmDeleteId(null);
    setStatus(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Saved Addresses
          </h1>
          <p className="mt-1 max-w-prose text-sm text-slate-600">
            Where providers come to you for home services like aircon cleaning. Your default is
            filled in first when you book.
          </p>
        </div>
        {count > 0 && <AddressMeter count={count} />}
      </div>

      {status && (
        <div
          role={status.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl border p-4 text-sm font-medium ${
            status.type === "success"
              ? "border-green-200 bg-accent text-green-800"
              : "border-danger/30 bg-red-50 text-danger"
          }`}
        >
          {status.type === "success" && <Check className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {status.text}
        </div>
      )}

      {count === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex">
              <AddressCard
                address={address}
                isLoading={actionLoadingId === address.id}
                isConfirmingDelete={confirmDeleteId === address.id}
                onSetDefault={() => handleSetDefault(address.id)}
                onEdit={() => openEdit(address)}
                onAskDelete={() => {
                  setStatus(null);
                  setConfirmDeleteId(address.id);
                }}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDelete(address.id)}
              />
            </li>
          ))}

          <li className="flex">
            {atLimit ? (
              <div className="flex w-full flex-col justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-slate-600">
                <p className="font-semibold text-navy-900">
                  You&apos;ve saved {MAX_SAVED_ADDRESSES} addresses
                </p>
                <p className="mt-1">
                  That&apos;s the most you can keep. Delete one to add another.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAdd}
                className="group flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-5 text-center transition-all hover:border-primary/60 hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.99]"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                  <Plus className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-navy-900">Add another address</span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    {slotsLeft} of {MAX_SAVED_ADDRESSES} {slotsLeft === 1 ? "slot" : "slots"} left
                  </span>
                </span>
              </button>
            )}
          </li>
        </ul>
      )}

      <AddressModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(mode) =>
          setStatus({
            type: "success",
            text: mode === "created" ? "Address saved." : "Address updated.",
          })
        }
        addressToEdit={editingAddress}
        cities={cities}
      />
    </div>
  );
}

function AddressMeter({ count }: { count: number }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: MAX_SAVED_ADDRESSES }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-6 rounded-full ${i < count ? "bg-primary" : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-slate-600">
        <span className="font-semibold text-navy-900">{count}</span> of {MAX_SAVED_ADDRESSES} saved
      </p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-2xs">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-green-700">
        <MapPin className="size-7" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-navy-900">No saved addresses yet</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-600">
        Add your home or office once and skip typing it every time you book a home service. You can
        save up to {MAX_SAVED_ADDRESSES}.
      </p>
      <Button type="button" onClick={onAdd} className="mt-6 active:scale-[0.98]">
        <Plus aria-hidden />
        Add your first address
      </Button>
    </div>
  );
}

type AddressCardProps = {
  address: SavedAddressItem;
  isLoading: boolean;
  isConfirmingDelete: boolean;
  onSetDefault: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

function AddressCard({
  address,
  isLoading,
  isConfirmingDelete,
  onSetDefault,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: AddressCardProps) {
  const Icon = labelIcon(address.label);
  const area = [address.barangayName, address.cityName].filter(Boolean).join(", ");
  const titleId = `address-${address.id}-label`;

  return (
    <article
      aria-labelledby={titleId}
      aria-busy={isLoading}
      className={`flex w-full flex-col rounded-2xl border bg-card shadow-2xs transition-colors ${
        address.isDefault ? "border-primary/60 ring-1 ring-primary/25" : "border-border"
      }`}
    >
      <div className="flex-1 p-5">
        <div className="flex items-start gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
              address.isDefault ? "bg-primary text-primary-foreground" : "bg-accent text-green-700"
            }`}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="truncate text-base font-semibold text-navy-900">
                {address.label}
              </h2>
              {address.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-green-700">
                  <Star className="size-3 fill-current" aria-hidden />
                  Default
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium break-words text-navy-900">
              {address.streetAddress}
            </p>
            {area && <p className="text-sm text-slate-600">{area}</p>}
          </div>
        </div>

        {(address.notes || address.recipientName || address.phone) && (
          <dl className="mt-4 space-y-1.5 border-t border-border/70 pt-4 text-sm text-slate-600">
            {address.notes && (
              <div className="flex items-start gap-2">
                <dt className="sr-only">Landmark</dt>
                <StickyNote className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                <dd className="min-w-0 break-words">{address.notes}</dd>
              </div>
            )}
            {address.recipientName && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Contact</dt>
                <User className="size-4 shrink-0 text-slate-400" aria-hidden />
                <dd className="truncate">{address.recipientName}</dd>
              </div>
            )}
            {address.phone && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Phone</dt>
                <Phone className="size-4 shrink-0 text-slate-400" aria-hidden />
                <dd>{formatPhone(address.phone)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="flex min-h-14 items-center justify-between gap-2 border-t border-border/70 px-2 py-1.5">
        {isConfirmingDelete ? (
          <>
            <p className="pl-3 text-sm font-semibold text-navy-900">Delete this address?</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancelDelete}
                disabled={isLoading}
                className="px-3 text-sm"
              >
                Keep
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onConfirmDelete}
                disabled={isLoading}
                className="px-4 text-sm active:scale-[0.98]"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {address.isDefault ? (
              <span aria-hidden />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={onSetDefault}
                disabled={isLoading}
                className="px-3 text-sm text-green-700 hover:text-green-800"
              >
                {isLoading ? "Saving..." : "Set as default"}
              </Button>
            )}
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onEdit}
                disabled={isLoading}
                className="px-3 text-sm text-slate-700"
                aria-label={`Edit ${address.label} address`}
              >
                <Pencil className="size-4" aria-hidden />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onAskDelete}
                disabled={isLoading}
                className="px-3 text-sm text-danger hover:bg-red-50 hover:text-danger"
                aria-label={`Delete ${address.label} address`}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function AddressListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading saved addresses" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card shadow-2xs">
            <div className="flex gap-3 p-5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>
            </div>
            <div className="h-14 border-t border-border/70" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading saved addresses…</span>
    </div>
  );
}
