"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSavedAddress, updateSavedAddress } from "@/features/account/actions";
import { ADDRESS_LABELS } from "@/features/account/constants";
import type { CityOption, SavedAddressItem } from "@/features/account/queries";
import { formatPhone } from "@/lib/phone";

type AddressModalProps = {
  open: boolean;
  onClose: () => void;
  addressToEdit?: SavedAddressItem | null;
  cities: CityOption[];
};

export function AddressModal({ open, onClose, addressToEdit, cities }: AddressModalProps) {
  const isEditing = Boolean(addressToEdit);

  const [label, setLabel] = React.useState(addressToEdit?.label ?? "Home");
  const [recipientName, setRecipientName] = React.useState(addressToEdit?.recipientName ?? "");
  const [phone, setPhone] = React.useState(
    addressToEdit?.phone ? formatPhone(addressToEdit.phone) : "",
  );
  const [streetAddress, setStreetAddress] = React.useState(addressToEdit?.streetAddress ?? "");
  const [cityId, setCityId] = React.useState(addressToEdit?.cityId ?? "");
  const [barangayId, setBarangayId] = React.useState(addressToEdit?.barangayId ?? "");
  const [notes, setNotes] = React.useState(addressToEdit?.notes ?? "");
  const [isDefault, setIsDefault] = React.useState(addressToEdit?.isDefault ?? false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state when addressToEdit changes
  React.useEffect(() => {
    if (addressToEdit) {
      setLabel(addressToEdit.label);
      setRecipientName(addressToEdit.recipientName ?? "");
      setPhone(addressToEdit.phone ? formatPhone(addressToEdit.phone) : "");
      setStreetAddress(addressToEdit.streetAddress);
      setCityId(addressToEdit.cityId ?? "");
      setBarangayId(addressToEdit.barangayId ?? "");
      setNotes(addressToEdit.notes ?? "");
      setIsDefault(addressToEdit.isDefault);
    } else {
      setLabel("Home");
      setRecipientName("");
      setPhone("");
      setStreetAddress("");
      setCityId("");
      setBarangayId("");
      setNotes("");
      setIsDefault(false);
    }
    setError(null);
  }, [addressToEdit, open]);

  // Available barangays based on selected city
  const selectedCity = cities.find((c) => c.id === cityId);
  const availableBarangays = selectedCity?.barangays ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetAddress.trim()) {
      setError("Please enter your street address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        label: label.trim(),
        recipientName: recipientName.trim() || null,
        phone: phone.trim() || null,
        streetAddress: streetAddress.trim(),
        cityId: cityId || null,
        barangayId: barangayId || null,
        notes: notes.trim() || null,
        isDefault,
      };

      if (isEditing && addressToEdit) {
        const result = await updateSavedAddress({
          id: addressToEdit.id,
          ...payload,
        });
        if (result.ok) {
          onClose();
        } else {
          setError(result.message);
        }
      } else {
        const result = await createSavedAddress(payload);
        if (result.ok) {
          onClose();
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError("Failed to save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 id="address-modal-title" className="font-display text-2xl font-bold text-navy-900">
            {isEditing ? "Edit saved address" : "Add new address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger/30 bg-red-50 p-3 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Label preset selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-700 uppercase">
              Address Label <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ADDRESS_LABELS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLabel(preset)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    label === preset
                      ? "bg-navy-900 text-white"
                      : "bg-muted text-slate-700 hover:bg-accent"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient & Contact phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addr-recipient"
                className="mb-1.5 block text-sm font-medium text-navy-900"
              >
                Contact name
              </label>
              <Input
                id="addr-recipient"
                type="text"
                placeholder="e.g. Maria Santos"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="addr-phone"
                className="mb-1.5 block text-sm font-medium text-navy-900"
              >
                Contact phone
              </label>
              <Input
                id="addr-phone"
                type="tel"
                placeholder="0917 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Street Address */}
          <div>
            <label htmlFor="addr-street" className="mb-1.5 block text-sm font-medium text-navy-900">
              Street Address / Unit / House # <span className="text-danger">*</span>
            </label>
            <Input
              id="addr-street"
              type="text"
              placeholder="e.g. Unit 4B, 123 Rizal St., San Roque"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* City & Barangay Dropdowns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="addr-city" className="mb-1.5 block text-sm font-medium text-navy-900">
                City
              </label>
              <select
                id="addr-city"
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setBarangayId("");
                }}
                disabled={loading}
                className="h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="addr-barangay"
                className="mb-1.5 block text-sm font-medium text-navy-900"
              >
                Barangay
              </label>
              <select
                id="addr-barangay"
                value={barangayId}
                onChange={(e) => setBarangayId(e.target.value)}
                disabled={loading || !cityId}
                className="h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="">{cityId ? "Select Barangay" : "Select City first"}</option>
                {availableBarangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Landmark / Notes */}
          <div>
            <label htmlFor="addr-notes" className="mb-1.5 block text-sm font-medium text-navy-900">
              Landmark / Delivery notes
            </label>
            <Input
              id="addr-notes"
              type="text"
              placeholder="e.g. Near gate 2, beside yellow bakery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Make Default Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="addr-default"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              disabled={loading}
              className="size-5 rounded border-slate-300 accent-primary focus:ring-navy-900"
            />
            <label
              htmlFor="addr-default"
              className="cursor-pointer text-sm font-medium text-navy-900"
            >
              Set as my default address
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary font-semibold text-white hover:bg-primary/90"
              disabled={loading || !streetAddress.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Save address"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
