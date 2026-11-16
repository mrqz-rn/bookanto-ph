"use client";

import { LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingType } from "@/lib/db/schema/enums";
import { coarsen, isInPhilippines } from "@/lib/geo";

import {
  RATING_FILTERS,
  SEARCH_RADII_KM,
  SEARCH_SORT_OPTIONS,
  type SearchSortOption,
} from "../constants";
import { countActiveFilters, EMPTY_SEARCH, searchHrefWith, type SearchState } from "../params";

type Option = { slug: string; name: string };
type CityOption = Option & { lat: number; lng: number };

const BOOKING_TYPES: Array<{ value: BookingType; label: string }> = [
  { value: "slot", label: "Pick a time" },
  { value: "home", label: "Home service" },
  { value: "quote", label: "Ask for a quote" },
  { value: "queue", label: "Walk-in queue" },
];

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

// The place chosen on /explore ("Popular near you") is saved under this key.
const PLACE_KEY = "bookanto:place";

/** Pesos typed by the customer to centavos; empty or invalid means no bound. */
function toCentavos(pesos: string): number | null {
  const value = Number(pesos);
  return pesos.trim() !== "" && Number.isFinite(value) && value >= 0
    ? Math.round(value) * 100
    : null;
}

export function SearchFilters({
  state,
  categories,
  cities,
  nearLabel,
}: {
  state: SearchState;
  categories: Option[];
  cities: CityOption[];
  /** "Marikina" or "your location", when the search has a place. */
  nearLabel: string | null;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(state.q);
  const [priceMin, setPriceMin] = React.useState(
    state.priceMin !== null ? String(state.priceMin / 100) : "",
  );
  const [priceMax, setPriceMax] = React.useState(
    state.priceMax !== null ? String(state.priceMax / 100) : "",
  );
  const [showFilters, setShowFilters] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [locationProblem, setLocationProblem] = React.useState<string | null>(null);
  const activeFilters = countActiveFilters(state);

  const go = (changes: Partial<SearchState>) => router.push(searchHrefWith(state, changes));

  function locate() {
    setLocationProblem(null);
    if (!("geolocation" in navigator)) {
      setLocationProblem("This browser can't share your location. Choose a city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const lat = coarsen(coords.latitude);
        const lng = coarsen(coords.longitude);
        if (!isInPhilippines(lat, lng)) {
          setLocationProblem("BooKanto is only in the Philippines for now. Choose a city instead.");
          return;
        }
        try {
          localStorage.setItem(PLACE_KEY, JSON.stringify({ lat, lng, label: "your location" }));
        } catch {
          // Storage turned off: it just won't be remembered.
        }
        go({ near: { lat, lng }, sort: "distance" });
      },
      (error) => {
        setLocating(false);
        setLocationProblem(
          error.code === error.PERMISSION_DENIED
            ? "Location is turned off for this site. Choose a city instead."
            : "We couldn't find your location. Choose a city instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: q.trim() });
        }}
        className="flex gap-2"
      >
        <label htmlFor="search-q" className="sr-only">
          Search shops and services
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-600"
          />
          <Input
            id="search-q"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Haircut, aircon, Marikina…"
            enterKeyHint="search"
            maxLength={100}
            className="h-11 pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          aria-controls="search-filter-panel"
          className="lg:hidden"
        >
          <SlidersHorizontal aria-hidden />
          <span className="sr-only sm:not-sr-only">Filters</span>
          {activeFilters > 0 && (
            <span aria-label={`${activeFilters} active`}>({activeFilters})</span>
          )}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {state.near ? (
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-white px-4 text-sm">
            <MapPin aria-hidden className="size-4 text-green-700" />
            Near {nearLabel ?? "you"}
            <button
              type="button"
              onClick={() =>
                go({ near: null, sort: state.sort === "distance" ? "recommended" : state.sort })
              }
              className="-mr-2 inline-flex size-9 items-center justify-center rounded-full hover:bg-accent"
              aria-label="Stop searching near this place"
            >
              <X aria-hidden className="size-4" />
            </button>
          </span>
        ) : (
          <Button type="button" variant="outline" onClick={locate} disabled={locating}>
            <LocateFixed aria-hidden />
            {locating ? "Finding you…" : "Near me"}
          </Button>
        )}
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-input bg-white px-4 text-sm has-[:checked]:border-green-700 has-[:checked]:bg-accent">
          <input
            type="checkbox"
            checked={state.openNow}
            onChange={(event) => go({ openNow: event.target.checked })}
            className="size-4 accent-green-700"
          />
          Open now
        </label>
        {locationProblem && (
          <p role="alert" className="w-full text-sm text-danger">
            {locationProblem}
          </p>
        )}
      </div>

      <div
        id="search-filter-panel"
        className={`${showFilters ? "grid" : "hidden"} gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
      >
        <Field id="search-category" label="Category">
          <select
            id="search-category"
            value={state.category ?? ""}
            onChange={(event) => go({ category: event.target.value || null })}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="search-city" label="City">
          <select
            id="search-city"
            value={state.city ?? ""}
            onChange={(event) => go({ city: event.target.value || null, barangay: null })}
            className={selectClass}
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="search-type" label="How you book">
          <select
            id="search-type"
            value={state.bookingType ?? ""}
            onChange={(event) =>
              go({ bookingType: (event.target.value || null) as BookingType | null })
            }
            className={selectClass}
          >
            <option value="">Any way</option>
            {BOOKING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="search-sort" label="Sort by">
          <select
            id="search-sort"
            value={state.sort}
            onChange={(event) => go({ sort: event.target.value as SearchSortOption })}
            className={selectClass}
          >
            {SEARCH_SORT_OPTIONS.filter((option) => option.value !== "distance" || state.near).map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field id="search-rating" label="Rating">
          <select
            id="search-rating"
            value={state.minRating ?? ""}
            onChange={(event) =>
              go({ minRating: event.target.value ? Number(event.target.value) : null })
            }
            className={selectClass}
          >
            <option value="">Any rating</option>
            {RATING_FILTERS.map((rating) => (
              <option key={rating} value={rating}>
                {rating}+ stars
              </option>
            ))}
          </select>
        </Field>

        {state.near && (
          <Field id="search-radius" label="Distance">
            <select
              id="search-radius"
              value={state.radiusKm}
              onChange={(event) => go({ radiusKm: Number(event.target.value) })}
              className={selectClass}
            >
              {SEARCH_RADII_KM.map((km) => (
                <option key={km} value={km}>
                  Within {km} km
                </option>
              ))}
            </select>
          </Field>
        )}

        <form
          className="flex flex-col gap-1.5 sm:col-span-2"
          onSubmit={(event) => {
            event.preventDefault();
            go({ priceMin: toCentavos(priceMin), priceMax: toCentavos(priceMax) });
          }}
        >
          <span className="text-sm font-semibold" id="search-price-label">
            Starting price (₱)
          </span>
          <div className="flex gap-2">
            <Input
              aria-label="Minimum price in pesos"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              placeholder="Min"
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
            <Input
              aria-label="Maximum price in pesos"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              placeholder="Max"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
            />
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={state.verified}
              onChange={(event) => go({ verified: event.target.checked })}
              className="size-4 accent-green-700"
            />
            Verified shops only
          </label>
          {(activeFilters > 0 || state.q) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(searchHrefWith(EMPTY_SEARCH, {}))}
            >
              <X aria-hidden />
              Clear all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
