"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, pesosToCentavos } from "@/lib/money";
import { formatManila, manilaToUtc } from "@/lib/time";
import { cn } from "@/lib/utils";

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

const FIELD = "flex flex-col gap-1.5";
const LABEL = "text-sm font-semibold text-navy-900";
const SELECT =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base text-navy-900 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

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

  // Each opening starts from a clean form, so one guest's details never carry
  // over to the next. Only on opening: the Today view refreshes its data in the
  // background, and a reset then would wipe what the staff is typing.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    const opening = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (!opening) return;
    setServiceId((current) =>
      services.some((s) => s.id === current) ? current : (services[0]?.id ?? ""),
    );
    setStaffId("");
    setCustomerName("");
    setCustomerPhone("");
    setOverridePrice(false);
    setCustomPricePesos("");
    setStatus("confirmed");
    setNotes("");
    if (initialTime) {
      setUseCurrentTime(false);
      // The field shows Manila wall-clock time, whatever the device's zone.
      setCustomDateTime(formatManila(initialTime, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setUseCurrentTime(true);
      setCustomDateTime("");
    }
    setError(null);
  }, [isOpen, services, initialTime]);

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
      const [day = "", time = ""] = customDateTime.split("T");
      startIso = manilaToUtc(day, time).toISOString();
    }

    let priceCentavos: number | null = null;
    if (overridePrice && customPricePesos) {
      try {
        priceCentavos = pesosToCentavos(customPricePesos);
      } catch {
        setError("Enter the price in pesos, like 150 or 150.50.");
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
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't add the walk-in. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const defaultPrice =
    selectedService?.priceCentavos !== null && selectedService?.priceCentavos !== undefined
      ? formatPeso(selectedService.priceCentavos)
      : "Quote";

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex max-h-[92dvh] w-full flex-col bg-white shadow-xl outline-none",
            // A sheet from the bottom on phones, a centred dialog from 640px.
            "inset-x-0 bottom-0 rounded-t-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 pt-5 pb-4 sm:px-6">
            <div>
              <Dialog.Title className="font-display text-2xl font-bold text-navy-900">
                Add walk-in
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-slate-600">
                A customer who came in without booking online.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              disabled={loading}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-slate-600 outline-none hover:bg-muted hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>

          {services.length === 0 ? (
            <div className="flex flex-col items-start gap-4 p-5 sm:p-6">
              <p className="text-slate-600">
                Add at least one active service first. A walk-in needs a service and a price.
              </p>
              <Button asChild>
                <Link href="/dashboard/services">Add a service</Link>
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex min-h-0 flex-1 flex-col [&_input::placeholder]:text-slate-500"
            >
              <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={FIELD}>
                    <label htmlFor="walk-in-name" className={LABEL}>
                      Customer name <span className="font-normal text-slate-600">(optional)</span>
                    </label>
                    <Input
                      id="walk-in-name"
                      type="text"
                      autoComplete="off"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      maxLength={100}
                      className="h-11"
                    />
                  </div>
                  <div className={FIELD}>
                    <label htmlFor="walk-in-phone" className={LABEL}>
                      Mobile <span className="font-normal text-slate-600">(optional)</span>
                    </label>
                    <Input
                      id="walk-in-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0917 123 4567"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className={FIELD}>
                  <label htmlFor="walk-in-service" className={LABEL}>
                    Service
                  </label>
                  <select
                    id="walk-in-service"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className={SELECT}
                    required
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.durationMin} min ·{" "}
                        {s.priceCentavos !== null ? formatPeso(s.priceCentavos) : "Quote"}
                      </option>
                    ))}
                  </select>
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-muted/60 px-3">
                    {overridePrice ? (
                      <>
                        <label htmlFor="walk-in-price" className="text-sm text-slate-600">
                          Price (₱)
                        </label>
                        <Input
                          id="walk-in-price"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={customPricePesos}
                          onChange={(e) => setCustomPricePesos(e.target.value)}
                          placeholder={defaultPrice.replace("₱", "")}
                          autoFocus
                          className="h-9 max-w-32 bg-white text-right"
                        />
                      </>
                    ) : (
                      <span className="text-sm text-slate-600">
                        Price{" "}
                        <span className="font-semibold text-navy-900 tabular-nums">
                          {defaultPrice}
                        </span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOverridePrice(!overridePrice);
                        setCustomPricePesos("");
                      }}
                      className="min-h-11 shrink-0 rounded-md px-1 text-sm font-semibold text-green-700 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {overridePrice ? "Use list price" : "Change price"}
                    </button>
                  </div>
                </div>

                <div className={FIELD}>
                  <label htmlFor="walk-in-staff" className={LABEL}>
                    Served by <span className="font-normal text-slate-600">(optional)</span>
                  </label>
                  <select
                    id="walk-in-staff"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className={SELECT}
                  >
                    <option value="">Anyone</option>
                    {staff.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Segmented
                    label="Started"
                    value={useCurrentTime ? "now" : "custom"}
                    onChange={(v) => setUseCurrentTime(v === "now")}
                    options={[
                      { value: "now", label: "Just now" },
                      { value: "custom", label: "Pick a time" },
                    ]}
                  />
                  <Segmented
                    label="Status"
                    value={status}
                    onChange={(v) => setStatus(v)}
                    options={[
                      { value: "confirmed", label: "Being served" },
                      { value: "completed", label: "Done" },
                    ]}
                  />
                </div>

                {!useCurrentTime && (
                  <div className={FIELD}>
                    <label htmlFor="walk-in-time" className={LABEL}>
                      Date and time
                    </label>
                    <Input
                      id="walk-in-time"
                      type="datetime-local"
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                )}

                <div className={FIELD}>
                  <label htmlFor="walk-in-notes" className={LABEL}>
                    Notes <span className="font-normal text-slate-600">(optional)</span>
                  </label>
                  <Input
                    id="walk-in-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. short taper fade"
                    maxLength={200}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                {error && (
                  <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                    <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline" disabled={loading}>
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="transition-transform active:scale-[0.98]"
                  >
                    {loading && <Loader2 aria-hidden className="animate-spin" />}
                    {loading ? "Adding…" : "Add walk-in"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  const id = React.useId();
  return (
    <div className={FIELD}>
      <span id={id} className={LABEL}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-md px-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              value === option.value
                ? "bg-white text-navy-900 shadow-xs"
                : "text-slate-600 hover:text-navy-900",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
