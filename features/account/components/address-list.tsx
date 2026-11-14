"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { deleteSavedAddress, setDefaultAddress } from "@/features/account/actions";
import type { CityOption, SavedAddressItem } from "@/features/account/queries";
import { formatPhone } from "@/lib/phone";
import { AddressModal } from "./address-modal";

type AddressListProps = {
  addresses: SavedAddressItem[];
  cities: CityOption[];
};

export function AddressList({ addresses, cities }: AddressListProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<SavedAddressItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSetDefault = async (id: string) => {
    setActionLoadingId(id);
    setError(null);
    try {
      const result = await setDefaultAddress({ id });
      if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("Failed to set default address. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setActionLoadingId(id);
    setError(null);
    try {
      const result = await deleteSavedAddress({ id });
      if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("Failed to delete address. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openAdd = () => {
    setEditingAddress(null);
    setModalOpen(true);
  };

  const openEdit = (address: SavedAddressItem) => {
    setEditingAddress(address);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Saved Addresses</h2>
          <p className="mt-1 text-sm text-slate-600">
            Save addresses for faster booking of home services like aircon cleaning.
          </p>
        </div>
        <Button
          type="button"
          onClick={openAdd}
          className="h-11 bg-primary font-semibold text-white hover:bg-primary/90"
        >
          + Add new address
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-red-50 p-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Address cards or Empty state */}
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-2xs">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent text-2xl">
            📍
          </div>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">No saved addresses yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-600">
            Add your home or office address to make requesting home services fast and hassle-free.
          </p>
          <Button
            type="button"
            onClick={openAdd}
            className="mt-5 h-11 bg-primary font-semibold text-white hover:bg-primary/90"
          >
            Add your first address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addresses.map((address) => {
            const isLoading = actionLoadingId === address.id;
            return (
              <div
                key={address.id}
                className={`relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-2xs transition-all ${
                  address.isDefault ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg font-semibold text-navy-900">
                      {address.label}
                    </span>
                    {address.isDefault && (
                      <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-navy-900">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-medium text-navy-900">{address.streetAddress}</p>
                  {(address.barangayName || address.cityName) && (
                    <p className="text-xs text-slate-600">
                      {[address.barangayName, address.cityName].filter(Boolean).join(", ")}
                    </p>
                  )}

                  {address.notes && (
                    <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-slate-600">
                      <span className="font-medium">Note:</span> {address.notes}
                    </p>
                  )}

                  {(address.recipientName || address.phone) && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span>👤 {address.recipientName || "Contact"}</span>
                      {address.phone && <span>• {formatPhone(address.phone)}</span>}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                  <div>
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={isLoading}
                        className="text-xs font-medium text-green-700 underline underline-offset-2 hover:text-green-800 disabled:opacity-50"
                      >
                        Set as default
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(address)}
                      disabled={isLoading}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      disabled={isLoading}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-danger hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Address modal for add/edit */}
      <AddressModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        addressToEdit={editingAddress}
        cities={cities}
      />
    </div>
  );
}
