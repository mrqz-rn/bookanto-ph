"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createShop, updateShop } from "../actions";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

type StepDetailsProps = {
  shopId?: string;
  initialName?: string;
  initialSlug?: string;
  initialDescription?: string | null;
  initialPhone?: string | null;
  initialCategoryIds?: string[];
  categories: CategoryItem[];
  onComplete: (shop: { shopId: string; slug: string }) => void;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StepDetails({
  shopId,
  initialName = "",
  initialSlug = "",
  initialDescription = "",
  initialPhone = "",
  initialCategoryIds = [],
  categories,
  onComplete,
}: StepDetailsProps) {
  const [name, setName] = React.useState(initialName);
  const [slug, setSlug] = React.useState(initialSlug);
  const [description, setDescription] = React.useState(initialDescription || "");
  const [phone, setPhone] = React.useState(initialPhone || "");
  const [selectedCategoryIds, setSelectedCategoryIds] =
    React.useState<string[]>(initialCategoryIds);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!shopId && !slug) {
      setSlug(slugify(val));
    }
  };

  const handleAutoSlug = () => {
    if (name) setSlug(slugify(name));
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedCategoryIds.length === 0) {
      setError("Please select at least one category for your shop.");
      return;
    }

    setLoading(true);

    try {
      if (shopId) {
        const result = await updateShop({
          shopId,
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || null,
          phone: phone.trim(),
          categoryIds: selectedCategoryIds,
        });

        if (result.ok) {
          onComplete({ shopId, slug: result.data.slug });
        } else {
          setError(result.message);
        }
      } else {
        const result = await createShop({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || null,
          phone: phone.trim(),
          categoryIds: selectedCategoryIds,
        });

        if (result.ok) {
          onComplete(result.data);
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError("Something went wrong. Please check the fields and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Shop Name */}
      <div>
        <label htmlFor="shop-name" className="block text-sm font-semibold text-neutral-900">
          Shop Name <span className="text-red-600">*</span>
        </label>
        <p className="mt-0.5 text-xs text-neutral-500">
          The public name of your business as customers know it.
        </p>
        <Input
          id="shop-name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. Kuya Jun's Barbershop"
          className="mt-1.5"
        />
      </div>

      {/* URL Slug */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="shop-slug" className="block text-sm font-semibold text-neutral-900">
            Web Address (Slug) <span className="text-red-600">*</span>
          </label>
          <button
            type="button"
            onClick={handleAutoSlug}
            className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:underline"
          >
            <Sparkles className="size-3" /> Auto-generate
          </button>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          Your unique web link on BooKanto: bookanto.ph/shop/<strong>{slug || "your-shop"}</strong>
        </p>
        <Input
          id="shop-slug"
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          placeholder="e.g. kuya-jun-barbershop-marikina"
          className="mt-1.5 font-mono text-xs"
        />
      </div>

      {/* Service Categories */}
      <div>
        <label className="block text-sm font-semibold text-neutral-900">
          Categories <span className="text-red-600">*</span>
        </label>
        <p className="mt-0.5 text-xs text-neutral-500">
          Select all services that apply to your business.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-navy-900 text-white shadow-xs"
                    : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                }`}
              >
                {isSelected && <Check className="size-3.5 text-orange-400" />}
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact Phone */}
      <div>
        <label htmlFor="shop-phone" className="block text-sm font-semibold text-neutral-900">
          Contact Phone Number <span className="text-red-600">*</span>
        </label>
        <p className="mt-0.5 text-xs text-neutral-500">
          For booking notifications and customer communication.
        </p>
        <Input
          id="shop-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0917 123 4567"
          className="mt-1.5"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="shop-desc" className="block text-sm font-semibold text-neutral-900">
          About Your Shop <span className="font-normal text-neutral-400">(Optional)</span>
        </label>
        <p className="mt-0.5 text-xs text-neutral-500">
          Tell customers about your experience, specialties, and equipment.
        </p>
        <textarea
          id="shop-desc"
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Friendly neighborhood barbershop serving Marikina for over 10 years..."
          className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus-visible:border-neutral-950 focus-visible:ring-1 focus-visible:ring-neutral-950"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
          {loading ? "Saving details..." : "Save & Continue to Location →"}
        </Button>
      </div>
    </form>
  );
}
