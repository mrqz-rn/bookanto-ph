"use client";

import * as React from "react";
import { AlertCircle, Loader2, Scissors, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, pesosToCentavos } from "@/lib/money";
import { addWalkIn } from "../actions";

type WalkInModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  services: Array<{ id: string; name: string; priceCentavos: number | null; durationMin: number }>;
  staff: Array<{ userId: string; name: string; role: string }>;
  initialTime?: string;
  onSuccess?: () => void;
};

export function WalkInModal({
  isOpen,
  onClose,
  shopId,
  services,
  staff,
  initialTime,
  onSuccess,
}: WalkInModalProps) {
  const [serviceId, setServiceId] = React.useState(services[0]?.id || "");
  const [staffId, setStaffId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [useCurrentTime, setUseCurrentTime] = React.useState(true);
  const [customDateTime, setCustomDateTime] = React.useState("");
  const [overridePrice, setOverridePrice] = React.useState(false);
  const [customPricePesos, setCustomPricePesos] = React.useState("");
  const [status, setStatus] = React.useState<"confirmed" | "completed">("confirmed");
  const [notes, setNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (services.length > 0 && !serviceId && services[0]) {
        setServiceId(services[0].id);
      }
      if (initialTime) {
        setUseCurrentTime(false);
        const d = new Date(initialTime);
        const pad = (n: number) => String(n).padStart(2, "0");
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setCustomDateTime(formatted);
      } else {
        setUseCurrentTime(true);
      }
      setError(null);
    }
  }, [isOpen, services, serviceId, initialTime]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === serviceId) || services[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedService) {
      setError("Please select a service.");
      return;
    }

    let startIso: string;
    if (useCurrentTime) {
      startIso = new Date().toISOString();
    } else {
      if (!customDateTime) {
        setError("Please choose a date and time.");
        return;
      }
      startIso = new Date(customDateTime).toISOString();
    }

    let priceCentavos: number | null = null;
    if (overridePrice && customPricePesos) {
      try {
        priceCentavos = pesosToCentavos(customPricePesos);
      } catch {
        setError("Invalid price amount.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await addWalkIn({
        shopId,
        serviceId: selectedService.id,
        staffId: staffId || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        startAt: startIso,
        priceCentavos,
        status,
        notes: notes.trim() || null,
      });

      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record walk-in booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Scissors className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-neutral-900">
                Record Walk-in Client
              </h2>
              <p className="text-xs text-neutral-500">
                Record in-shop client appointment or serviced visit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Service Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Service <span className="text-red-600">*</span>
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
              required
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMin} mins ·{" "}
                  {s.priceCentavos !== null ? formatPeso(s.priceCentavos) : "Quote"})
                </option>
              ))}
            </select>
          </div>

          {/* Staff Member Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Assign Staff Member (Optional)
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
            >
              <option value="">Any Available Staff / Unassigned</option>
              {staff.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Guest Name (Optional)
              </label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Juan or Kuya Joe"
                maxLength={100}
                className="mt-1 h-10 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Mobile Phone (Optional)
              </label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0917 123 4567"
                className="mt-1 h-10 text-sm"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">Appointment Start Time</span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUseCurrentTime(true)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    useCurrentTime
                      ? "text-navy-950 bg-white font-bold shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Right Now
                </button>
                <button
                  type="button"
                  onClick={() => setUseCurrentTime(false)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    !useCurrentTime
                      ? "text-navy-950 bg-white font-bold shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Custom Time
                </button>
              </div>
            </div>

            {!useCurrentTime && (
              <Input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="h-10 bg-white text-sm"
                required={!useCurrentTime}
              />
            )}
          </div>

          {/* Status & Price Override */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-900">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "confirmed" | "completed")}
                className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
              >
                <option value="confirmed">Confirmed (In progress / Queued)</option>
                <option value="completed">Completed (Already finished)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-900">Price (₱)</label>
                <button
                  type="button"
                  onClick={() => setOverridePrice(!overridePrice)}
                  className="text-[11px] text-orange-600 hover:underline"
                >
                  {overridePrice ? "Use Default" : "Custom Price"}
                </button>
              </div>
              {overridePrice ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPricePesos}
                  onChange={(e) => setCustomPricePesos(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-1 h-10 text-sm"
                />
              ) : (
                <div className="mt-1 flex h-10 items-center rounded-md border border-neutral-200 bg-neutral-100 px-3 text-sm font-semibold text-neutral-700">
                  {selectedService?.priceCentavos !== null &&
                  selectedService?.priceCentavos !== undefined
                    ? formatPeso(selectedService.priceCentavos)
                    : "Quote upon request"}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-900">Notes (Optional)</label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Requested short taper fade"
              maxLength={200}
              className="mt-1 h-10 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-green-600 font-bold text-white hover:bg-green-500"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Walk-in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
