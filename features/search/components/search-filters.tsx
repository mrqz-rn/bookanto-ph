"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingType } from "@/lib/db/schema/enums";

import { SEARCH_SORT_OPTIONS, type SearchSortOption } from "../constants";

type CategoryOption = { slug: string; name: string };
type CityOption = { slug: string; name: string };

type Props = {
  categories: CategoryOption[];
  cities: CityOption[];
  initialValues: {
    q?: string;
    category?: string;
    city?: string;
    bookingType?: string;
    priceMax?: number;
    openNow?: boolean;
    sort?: SearchSortOption;
  };
};

const BOOKING_TYPES: Array<{ value: BookingType; label: string }> = [
  { value: "slot", label: "Fixed Slot" },
  { value: "home", label: "Home Service" },
  { value: "quote", label: "Request Quote" },
  { value: "queue", label: "Walk-in Queue" },
];

export function SearchFilters({ categories, cities, initialValues }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = React.useState(initialValues.q ?? "");
  const [category, setCategory] = React.useState(initialValues.category ?? "");
  const [city, setCity] = React.useState(initialValues.city ?? "");
  const [bookingType, setBookingType] = React.useState(initialValues.bookingType ?? "");
  const [priceMax, setPriceMax] = React.useState<string>(
    initialValues.priceMax ? String(initialValues.priceMax / 100) : "",
  );
  const [openNow, setOpenNow] = React.useState(initialValues.openNow ?? false);
  const [sort, setSort] = React.useState<SearchSortOption>(initialValues.sort ?? "recommended");
  const [showFilters, setShowFilters] = React.useState(false);

  const applyFilters = (override?: Record<string, string | boolean | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    const values = {
      q: q.trim(),
      category,
      city,
      bookingType,
      priceMax: priceMax ? String(Number(priceMax) * 100) : "",
      open_now: openNow ? "true" : "",
      sort,
      ...override,
    };

    if (values.q) params.set("q", String(values.q));
    else params.delete("q");

    if (values.category) params.set("category", String(values.category));
    else params.delete("category");

    if (values.city) params.set("city", String(values.city));
    else params.delete("city");

    if (values.bookingType) params.set("type", String(values.bookingType));
    else params.delete("type");

    if (values.priceMax) params.set("price_max", String(values.priceMax));
    else params.delete("price_max");

    if (values.open_now && values.open_now !== "false") params.set("open_now", "true");
    else params.delete("open_now");

    if (values.sort && values.sort !== "recommended") params.set("sort", String(values.sort));
    else params.delete("sort");

    router.push(`/search?${params.toString()}`);
  };

  const resetFilters = () => {
    setQ("");
    setCategory("");
    setCity("");
    setBookingType("");
    setPriceMax("");
    setOpenNow(false);
    setSort("recommended");
    router.push("/search");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const hasActiveFilters = Boolean(
    category || city || bookingType || priceMax || openNow || (q && q.trim().length > 0),
  );

  return (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shops, services, or locations (e.g. fade, aircon, Marikina)..."
            className="h-11 pl-9 text-base"
          />
        </div>
        <Button type="submit" className="h-11 px-5">
          Search
        </Button>
        <Button
          type="button"
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="h-11 px-3 sm:hidden"
          aria-expanded={showFilters}
          aria-label="Toggle search filters"
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </form>

      {/* Quick Filter Pills (Always visible on desktop, collapsible on mobile) */}
      <div
        className={`space-y-3 rounded-lg border border-border bg-card p-4 shadow-2xs sm:block ${
          showFilters ? "block" : "hidden sm:block"
        }`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Category Filter */}
          <div>
            <label htmlFor="search-cat" className="mb-1 block text-xs font-semibold text-slate-700">
              Category
            </label>
            <select
              id="search-cat"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                applyFilters({ category: e.target.value });
              }}
              className="h-10 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label
              htmlFor="search-city"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              City
            </label>
            <select
              id="search-city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                applyFilters({ city: e.target.value });
              }}
              className="h-10 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All Cities</option>
              {cities.map((ct) => (
                <option key={ct.slug} value={ct.slug}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>

          {/* Booking Type Filter */}
          <div>
            <label
              htmlFor="search-type"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Booking Type
            </label>
            <select
              id="search-type"
              value={bookingType}
              onChange={(e) => {
                setBookingType(e.target.value);
                applyFilters({ bookingType: e.target.value });
              }}
              className="h-10 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Any Type</option>
              {BOOKING_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price Filter */}
          <div>
            <label
              htmlFor="search-price"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Max Price (₱)
            </label>
            <Input
              id="search-price"
              type="number"
              min="0"
              step="50"
              placeholder="e.g. 500"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              onBlur={() => applyFilters()}
              className="h-10 text-sm"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label
              htmlFor="search-sort"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Sort By
            </label>
            <select
              id="search-sort"
              value={sort}
              onChange={(e) => {
                const newSort = e.target.value as SearchSortOption;
                setSort(newSort);
                applyFilters({ sort: newSort });
              }}
              className="h-10 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {SEARCH_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(e) => {
                setOpenNow(e.target.checked);
                applyFilters({ open_now: e.target.checked });
              }}
              className="size-4 rounded border-input text-green-600 focus:ring-green-500"
            />
            <span>Open now (Manila time)</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <X className="size-3.5" />
              Reset all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
