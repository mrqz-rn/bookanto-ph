"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { applyCategoryTemplates } from "../actions";
import { BOOKING_TYPE_LABELS } from "../constants";
import { durationLabel, plural, servicePrice } from "../menu";
import { CATEGORY_SERVICE_TEMPLATES, type ServiceTemplateItem } from "../templates";
import { ActionError, Busy, FOCUS_RING, PRESS, Sheet } from "./services-ui";

type CategoryTemplatesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopCategorySlugs?: string[];
  /** Called after the services are added, with the line to show on the page. */
  onApplied: (message: string) => void;
};

const GROUPS = Object.values(CATEGORY_SERVICE_TEMPLATES);

export function CategoryTemplatesModal({
  isOpen,
  onClose,
  shopId,
  shopCategorySlugs = [],
  onApplied,
}: CategoryTemplatesModalProps) {
  const id = React.useId();
  // The shop's own categories first, so the first chip is usually the right one.
  const groups = React.useMemo(
    () =>
      [...GROUPS].sort(
        (a, b) =>
          Number(shopCategorySlugs.includes(b.categorySlug)) -
          Number(shopCategorySlugs.includes(a.categorySlug)),
      ),
    [shopCategorySlugs],
  );

  const [category, setCategory] = React.useState<string>(groups[0]?.categorySlug ?? "");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const group = groups.find((g) => g.categorySlug === category) ?? groups[0];

  // Opening the sheet or changing the category ticks every service in it.
  React.useEffect(() => {
    if (isOpen && group) {
      setSelected(new Set(group.services.map((s) => s.name)));
      setError(null);
    }
  }, [isOpen, group]);

  React.useEffect(() => {
    if (isOpen && groups[0] && !groups.some((g) => g.categorySlug === category)) {
      setCategory(groups[0].categorySlug);
    }
  }, [isOpen, groups, category]);

  if (!group) return null;

  const picked: ServiceTemplateItem[] = group.services.filter((s) => selected.has(s.name));
  const allPicked = picked.length === group.services.length;

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function onApply() {
    if (picked.length === 0) {
      setError("Tick at least one service to add.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await applyCategoryTemplates({ shopId, templates: picked });
      if (result.ok) {
        onApplied(
          `Added ${plural(picked.length, "service")} from the ${group!.categoryName} template. Edit the prices to match yours.`,
        );
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Couldn't add the services. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      busy={saving}
      wide
      title="Start from a template"
      description="Common services for your category with typical Philippine prices. You can edit each one after."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={saving || picked.length === 0}
            className={PRESS}
          >
            <Busy busy={saving}>Add {plural(picked.length, "service")}</Busy>
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div
          role="radiogroup"
          aria-label="Category"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6"
        >
          {groups.map((g) => {
            const active = g.categorySlug === group.categorySlug;
            return (
              <button
                key={g.categorySlug}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(g.categorySlug)}
                className={cn(
                  "h-11 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                  FOCUS_RING,
                  active
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-border bg-white text-navy-900 hover:bg-neutral-100",
                )}
              >
                {g.categoryName}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {picked.length} of {plural(group.services.length, "service")} ticked
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setSelected(allPicked ? new Set() : new Set(group.services.map((s) => s.name)))
            }
            className="text-green-700 hover:bg-accent hover:text-green-800"
          >
            {allPicked ? "Untick all" : "Tick all"}
          </Button>
        </div>

        {error && <ActionError message={error} onDismiss={() => setError(null)} />}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {group.services.map((item, index) => {
            const checked = selected.has(item.name);
            const inputId = `${id}-${index}`;
            return (
              <li key={item.name}>
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex h-full cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                    checked
                      ? "border-green-600 bg-accent/50 ring-1 ring-green-600"
                      : "border-border bg-white hover:border-neutral-400",
                  )}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.name)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                      checked
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-neutral-400 bg-white",
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-navy-900">{item.name}</span>
                      <span className="shrink-0 font-bold text-navy-900 tabular-nums">
                        {servicePrice(item.priceType, item.priceCentavos)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {durationLabel(item.durationMin)} · {BOOKING_TYPE_LABELS[item.bookingType]}
                      {item.capacity > 1 && ` · ${item.capacity} at once`}
                    </span>
                    {item.description && (
                      <span className="mt-1.5 line-clamp-2 block text-sm text-slate-600">
                        {item.description}
                      </span>
                    )}
                    {item.suggestedAddons && item.suggestedAddons.length > 0 && (
                      <span className="mt-2 block text-sm text-navy-900">
                        <span className="font-semibold">Add-ons:</span>{" "}
                        {item.suggestedAddons.map((a) => a.name).join(", ")}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
