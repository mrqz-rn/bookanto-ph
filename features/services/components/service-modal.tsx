"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pesosToCentavos } from "@/lib/money";
import { createService, updateService } from "../actions";
import {
  BOOKING_TYPE_DESCRIPTIONS,
  BOOKING_TYPE_LABELS,
  BUFFER_OPTIONS,
  DURATION_OPTIONS,
  PRICE_TYPE_LABELS,
} from "../constants";

type CategoryOption = {
  id: string;
  name: string;
};

type ServiceData = {
  id?: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  priceType: "fixed" | "starts_at" | "quote";
  priceCentavos?: number | null;
  durationMin: number;
  bookingType: "slot" | "home" | "quote" | "queue";
  capacity: number;
  bufferMin: number;
  active: boolean;
};

type ServiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  categories: CategoryOption[];
  initialService?: ServiceData | null;
  onSaved: () => void;
};

export function ServiceModal({
  isOpen,
  onClose,
  shopId,
  categories,
  initialService,
  onSaved,
}: ServiceModalProps) {
  const isEditing = !!initialService?.id;

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [priceType, setPriceType] = React.useState<"fixed" | "starts_at" | "quote">("fixed");
  const [pricePesos, setPricePesos] = React.useState("");
  const [durationMin, setDurationMin] = React.useState<number>(30);
  const [bookingType, setBookingType] = React.useState<"slot" | "home" | "quote" | "queue">("slot");
  const [capacity, setCapacity] = React.useState<number>(1);
  const [bufferMin, setBufferMin] = React.useState<number>(0);
  const [active, setActive] = React.useState<boolean>(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialService) {
      setName(initialService.name);
      setDescription(initialService.description || "");
      setCategoryId(initialService.categoryId || "");
      setPriceType(initialService.priceType);
      setPricePesos(
        initialService.priceCentavos !== null && initialService.priceCentavos !== undefined
          ? (initialService.priceCentavos / 100).toString()
          : "",
      );
      setDurationMin(initialService.durationMin);
      setBookingType(initialService.bookingType);
      setCapacity(initialService.capacity);
      setBufferMin(initialService.bufferMin);
      setActive(initialService.active);
    } else {
      setName("");
      setDescription("");
      setCategoryId(categories[0]?.id || "");
      setPriceType("fixed");
      setPricePesos("150");
      setDurationMin(30);
      setBookingType("slot");
      setCapacity(1);
      setBufferMin(0);
      setActive(true);
    }
    setError(null);
  }, [initialService, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let priceCentavos: number | null = null;
      if (priceType !== "quote") {
        if (!pricePesos) {
          setError("Please enter a price.");
          setLoading(false);
          return;
        }
        priceCentavos = pesosToCentavos(pricePesos);
      }

      if (isEditing && initialService?.id) {
        const result = await updateService({
          serviceId: initialService.id,
          shopId,
          name: name.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          priceType,
          priceCentavos,
          durationMin,
          bookingType,
          capacity,
          bufferMin,
          active,
        });

        if (result.ok) {
          onSaved();
          onClose();
        } else {
          setError(result.message);
        }
      } else {
        const result = await createService({
          shopId,
          name: name.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          priceType,
          priceCentavos,
          durationMin,
          bookingType,
          capacity,
          bufferMin,
          active,
        });

        if (result.ok) {
          onSaved();
          onClose();
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError("Failed to save service. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-display text-xl text-neutral-900">
            {isEditing ? "Edit Service" : "Add New Service"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Service Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Service Name <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Fade & Haircut"
              className="mt-1 h-10 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-neutral-900">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
            >
              <option value="">No specific category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price Type & Amount */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-900">Price Type</label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as "fixed" | "starts_at" | "quote")}
                className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
              >
                <option value="fixed">{PRICE_TYPE_LABELS.fixed}</option>
                <option value="starts_at">{PRICE_TYPE_LABELS.starts_at}</option>
                <option value="quote">{PRICE_TYPE_LABELS.quote}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Price (₱) {priceType !== "quote" && <span className="text-red-600">*</span>}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                disabled={priceType === "quote"}
                value={priceType === "quote" ? "" : pricePesos}
                onChange={(e) => setPricePesos(e.target.value)}
                placeholder={priceType === "quote" ? "Determined upon quote" : "150.00"}
                className="mt-1 h-10 text-sm"
              />
            </div>
          </div>

          {/* Duration & Buffer */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Duration <span className="text-red-600">*</span>
              </label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Buffer Time After Booking
              </label>
              <select
                value={bufferMin}
                onChange={(e) => setBufferMin(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Booking Type & Capacity */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-900">Booking Type</label>
              <select
                value={bookingType}
                onChange={(e) =>
                  setBookingType(e.target.value as "slot" | "home" | "quote" | "queue")
                }
                className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
              >
                <option value="slot">{BOOKING_TYPE_LABELS.slot}</option>
                <option value="home">{BOOKING_TYPE_LABELS.home}</option>
                <option value="quote">{BOOKING_TYPE_LABELS.quote}</option>
                <option value="queue">{BOOKING_TYPE_LABELS.queue}</option>
              </select>
              <p className="mt-1 text-[11px] text-neutral-500">
                {BOOKING_TYPE_DESCRIPTIONS[bookingType]}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Capacity Per Slot
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="mt-1 h-10 text-sm"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                How many clients can be served simultaneously.
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-900">Description</label>
            <textarea
              rows={2}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is included in this service?"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus-visible:border-neutral-950"
            />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="service-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="service-active" className="text-xs font-medium text-neutral-700">
              Active and visible to customers for online booking
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 border-t border-neutral-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
            >
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
