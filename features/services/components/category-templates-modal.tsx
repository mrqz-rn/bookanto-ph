"use client";

import * as React from "react";
import { Check, CheckSquare, Sparkles, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { applyCategoryTemplates } from "../actions";
import { CATEGORY_SERVICE_TEMPLATES, type ServiceTemplateItem } from "../templates";

type CategoryTemplatesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopCategorySlugs?: string[];
  onApplied: () => void;
};

export function CategoryTemplatesModal({
  isOpen,
  onClose,
  shopId,
  shopCategorySlugs = [],
  onApplied,
}: CategoryTemplatesModalProps) {
  const allGroups = Object.values(CATEGORY_SERVICE_TEMPLATES);

  // Default active tab to shop's first category if available
  const defaultCategory =
    allGroups.find((g) => shopCategorySlugs.includes(g.categorySlug))?.categorySlug ||
    allGroups[0]?.categorySlug ||
    "barbershop";

  const [activeCategory, setActiveCategory] = React.useState<string>(defaultCategory);
  const [selectedTemplates, setSelectedTemplates] = React.useState<ServiceTemplateItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentGroup = allGroups.find((g) => g.categorySlug === activeCategory) || allGroups[0];

  React.useEffect(() => {
    // Select all templates of current category by default when opened
    if (isOpen && currentGroup) {
      setSelectedTemplates([...currentGroup.services]);
    }
  }, [isOpen, activeCategory, currentGroup]);

  if (!isOpen || !currentGroup) return null;

  const toggleSelectTemplate = (item: ServiceTemplateItem) => {
    setSelectedTemplates((prev) =>
      prev.some((t) => t.name === item.name)
        ? prev.filter((t) => t.name !== item.name)
        : [...prev, item],
    );
  };

  const handleSelectAll = () => {
    if (!currentGroup) return;
    if (selectedTemplates.length === currentGroup.services.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates([...currentGroup.services]);
    }
  };

  const handleApply = async () => {
    if (selectedTemplates.length === 0) {
      setError("Please select at least one template service to apply.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await applyCategoryTemplates({
        shopId,
        templates: selectedTemplates,
      });

      if (result.ok) {
        onApplied();
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to apply templates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <Sparkles className="size-4" />
              </span>
              <h3 className="font-display text-xl text-neutral-900">Category Service Templates</h3>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              One-click setup with standard Philippine market prices, durations, and add-ons.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-neutral-200 bg-neutral-50/70 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allGroups.map((g) => {
              const isActive = g.categorySlug === activeCategory;
              return (
                <button
                  key={g.categorySlug}
                  type="button"
                  onClick={() => setActiveCategory(g.categorySlug)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-navy-900 text-white shadow-xs"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {g.categoryName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              {currentGroup.services.length} services available for {currentGroup.categoryName}
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:underline"
            >
              {selectedTemplates.length === currentGroup.services.length ? (
                <>
                  <CheckSquare className="size-4" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="size-4" /> Select All ({currentGroup.services.length})
                </>
              )}
            </button>
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentGroup.services.map((item) => {
              const isSelected = selectedTemplates.some((t) => t.name === item.name);

              return (
                <div
                  key={item.name}
                  onClick={() => toggleSelectTemplate(item)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-400"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-5 items-center justify-center rounded border ${
                          isSelected
                            ? "border-orange-600 bg-orange-600 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5" />}
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-900">{item.name}</h4>
                    </div>

                    <span className="text-xs font-bold text-navy-900">
                      {item.priceType === "quote"
                        ? "Quote"
                        : item.priceCentavos !== null
                          ? formatPeso(item.priceCentavos)
                          : "Custom"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-neutral-600">{item.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium">
                      ⏱ {item.durationMin} mins
                    </span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 capitalize">
                      {item.bookingType} flow
                    </span>
                    {item.capacity > 1 && (
                      <span className="rounded bg-neutral-100 px-2 py-0.5">
                        👥 Capacity: {item.capacity}
                      </span>
                    )}
                  </div>

                  {item.suggestedAddons && item.suggestedAddons.length > 0 && (
                    <div className="mt-2.5 border-t border-neutral-100 pt-2 text-[10px] text-neutral-500">
                      <span className="font-medium text-neutral-700">Includes Add-ons:</span>{" "}
                      {item.suggestedAddons.map((a) => a.name).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 p-4 sm:p-5">
          <span className="text-xs text-neutral-600">
            <strong>{selectedTemplates.length}</strong> template(s) selected
          </span>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || selectedTemplates.length === 0}
              onClick={handleApply}
              className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
            >
              {loading ? "Adding..." : `Apply Selected (${selectedTemplates.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
