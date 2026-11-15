"use client";

import * as React from "react";
import { X } from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingType } from "@/lib/db/schema/enums";

import { upsertCategory } from "../../actions";

type CategoryData = {
  id?: string;
  name: string;
  slug: string;
  icon: string | null;
  defaultBookingType: BookingType;
  sortOrder: number;
  active: boolean;
};

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  category?: CategoryData | null;
  onSuccess: () => void;
};

const POPULAR_ICONS = [
  "scissors",
  "sparkles",
  "hand",
  "flower-2",
  "air-vent",
  "wrench",
  "car",
  "dumbbell",
  "spray-can",
  "heart-pulse",
  "hammer",
  "home",
  "paw-print",
  "palette",
  "camera",
];

const BOOKING_TYPES: { type: BookingType; label: string; desc: string }[] = [
  {
    type: "slot",
    label: "Slot (On-premise)",
    desc: "Customer visits the shop at an appointed time",
  },
  { type: "home", label: "Home service", desc: "Service provider travels to customer location" },
  { type: "quote", label: "Custom quote", desc: "Price estimated before confirming appointment" },
  { type: "queue", label: "Queue / walk-in", desc: "Next available in queue" },
];

export function CategoryModal({ isOpen, onClose, category, onSuccess }: CategoryModalProps) {
  const [name, setName] = React.useState(category?.name ?? "");
  const [slug, setSlug] = React.useState(category?.slug ?? "");
  const [icon, setIcon] = React.useState(category?.icon ?? "scissors");
  const [defaultBookingType, setDefaultBookingType] = React.useState<BookingType>(
    category?.defaultBookingType ?? "slot",
  );
  const [sortOrder, setSortOrder] = React.useState(category?.sortOrder ?? 0);
  const [active, setActive] = React.useState(category?.active ?? true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setIcon(category.icon ?? "scissors");
      setDefaultBookingType(category.defaultBookingType);
      setSortOrder(category.sortOrder);
      setActive(category.active);
    } else {
      setName("");
      setSlug("");
      setIcon("scissors");
      setDefaultBookingType("slot");
      setSortOrder(0);
      setActive(true);
    }
    setError(null);
  }, [category, isOpen]);

  if (!isOpen) return null;

  // Auto-generate slug from name if creating new
  const handleNameChange = (val: string) => {
    setName(val);
    if (!category) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await upsertCategory({
        id: category?.id,
        name: name.trim(),
        slug: slug.trim(),
        icon: icon.trim(),
        defaultBookingType,
        sortOrder: Number(sortOrder),
        active,
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-neutral-900">
            {category ? "Edit Category" : "Add Service Category"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-neutral-700">Category Name</label>
            <Input
              required
              placeholder="e.g. Pet Grooming"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Slug</label>
            <Input
              required
              placeholder="e.g. pet-grooming"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 font-mono text-xs"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-semibold text-neutral-700">Select Icon</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {POPULAR_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`flex size-9 items-center justify-center rounded-lg border text-sm transition-colors ${
                    icon === ic
                      ? "border-green-600 bg-green-50 font-bold text-green-700"
                      : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <CategoryIcon icon={ic} className="size-4" />
                </button>
              ))}
            </div>
            <Input
              placeholder="Or type custom Lucide icon name..."
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="mt-2 text-xs"
            />
          </div>

          {/* Default Booking Type */}
          <div>
            <label className="text-xs font-semibold text-neutral-700">Default Booking Type</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {BOOKING_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  type="button"
                  onClick={() => setDefaultBookingType(bt.type)}
                  className={`flex flex-col rounded-lg border p-2 text-left transition-colors ${
                    defaultBookingType === bt.type
                      ? "border-green-600 bg-green-50/50"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-xs font-bold text-neutral-900 capitalize">{bt.label}</span>
                  <span className="text-[10px] text-neutral-500">{bt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700">Sort Order</label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="mt-1 text-xs"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-xs font-semibold text-neutral-800">Active in Directory</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim() || !slug.trim()}
              className="bg-green-700 text-xs text-white hover:bg-green-800"
            >
              {loading ? "Saving..." : category ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
