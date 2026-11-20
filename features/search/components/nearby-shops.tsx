"use client";

import { LocateFixed, MapPin, RotateCw } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { ShopRail, ShopRailSkeleton, type ShopCardData } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { coarsen, formatDistance, isInPhilippines } from "@/lib/geo";

import { findPopularShopsNear } from "../actions";
import { NEARBY_RADIUS_M } from "../constants";
import type { CityOption } from "../queries";

type Place = { lat: number; lng: number; label: string };

type Results =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; shops: ShopCardData[] };

// The chosen place stays on this device (plan: "remembered on the device").
const STORAGE_KEY = "bookanto:place";

function isPlace(value: unknown): value is Place {
  if (typeof value !== "object" || value === null) return false;
  const { lat, lng, label } = value as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    typeof label === "string" &&
    isInPhilippines(lat, lng)
  );
}

function loadPlace(): Place | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return isPlace(value) ? value : null;
  } catch {
    return null;
  }
}

function savePlace(place: Place) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    // Private browsing or storage turned off: it just won't be remembered.
  }
}

/** "Popular near you". The page around it is static; this part runs in the browser. */
export function NearbyShops({ cities }: { cities: CityOption[] }) {
  // undefined until the saved place has been read on the device.
  const [place, setPlace] = useState<Place | null | undefined>(undefined);
  const [choosing, setChoosing] = useState(false);
  const [results, setResults] = useState<Results>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setPlace(loadPlace()), []);

  useEffect(() => {
    if (!place) return;
    let current = true;
    setResults({ status: "loading" });
    findPopularShopsNear({ lat: place.lat, lng: place.lng })
      .then((result) => {
        if (!current) return;
        setResults(
          result.ok
            ? { status: "done", shops: result.data }
            : { status: "error", message: result.message },
        );
      })
      .catch(() => {
        if (current) {
          setResults({
            status: "error",
            message: "We couldn't load shops. Check your connection and try again.",
          });
        }
      });
    return () => {
      current = false;
    };
  }, [place, attempt]);

  function choose(next: Place) {
    savePlace(next);
    setPlace(next);
    setChoosing(false);
  }

  const picking = place === null || choosing;

  return (
    <section aria-labelledby="nearby-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 id="nearby-heading" className="font-display text-2xl font-bold">
            Popular near you
          </h2>
          {place && !picking && (
            <p className="flex items-center gap-1 text-sm text-slate-600">
              <MapPin aria-hidden className="size-4" />
              Near {place.label}
            </p>
          )}
        </div>
        {place && !picking && (
          <Button variant="link" onClick={() => setChoosing(true)} className="px-0">
            Change
          </Button>
        )}
      </div>

      {/* Keeps its height while loading, so the page below doesn't jump. */}
      <div
        className="min-h-72"
        aria-live="polite"
        aria-busy={place === undefined || (!picking && results.status === "loading")}
      >
        {place === undefined ? (
          <ShopRailSkeleton />
        ) : picking ? (
          <PlacePicker
            cities={cities}
            onChoose={choose}
            onCancel={place ? () => setChoosing(false) : undefined}
          />
        ) : results.status === "loading" ? (
          <ShopRailSkeleton />
        ) : results.status === "error" ? (
          <Notice title="Shops didn't load" body={results.message}>
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCw aria-hidden />
              Try again
            </Button>
          </Notice>
        ) : results.shops.length === 0 ? (
          <Notice
            title={`No shops within ${formatDistance(NEARBY_RADIUS_M)} yet`}
            body="BooKanto is just starting here. Try another city, or browse the shops below."
          >
            <Button variant="outline" onClick={() => setChoosing(true)}>
              Change location
            </Button>
          </Notice>
        ) : (
          <ShopRail shops={results.shops} />
        )}
      </div>
    </section>
  );
}

function PlacePicker({
  cities,
  onChoose,
  onCancel,
}: {
  cities: CityOption[];
  onChoose: (place: Place) => void;
  onCancel?: () => void;
}) {
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const cityFieldId = useId();

  function locate() {
    if (!("geolocation" in navigator)) {
      setProblem("This browser can't share your location. Choose your city instead.");
      return;
    }
    setLocating(true);
    setProblem(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const lat = coarsen(coords.latitude);
        const lng = coarsen(coords.longitude);
        if (!isInPhilippines(lat, lng)) {
          setProblem("BooKanto is only in the Philippines for now. Choose a city instead.");
          return;
        }
        onChoose({ lat, lng, label: "your location" });
      },
      (error) => {
        setLocating(false);
        setProblem(
          error.code === error.PERMISSION_DENIED
            ? "Location is turned off for this site. Choose your city instead."
            : "We couldn't find your location. Choose your city instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <div className="flex min-h-72 flex-col justify-center gap-4 rounded-lg border border-dashed border-input bg-white p-5">
      <div>
        <p className="font-semibold">See popular shops near you</p>
        <p className="text-sm text-slate-600">
          Your location is saved on this device only and used to sort shops by distance.
        </p>
      </div>
      <Button onClick={locate} disabled={locating} className="w-full sm:w-fit">
        <LocateFixed aria-hidden />
        {locating ? "Finding you…" : "Use my location"}
      </Button>
      {cities.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={cityFieldId} className="text-sm font-medium">
            Or choose your city
          </label>
          <select
            id={cityFieldId}
            defaultValue=""
            onChange={(event) => {
              const city = cities.find((c) => c.slug === event.target.value);
              if (city) onChoose({ lat: city.lat, lng: city.lng, label: city.name });
            }}
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-72"
          >
            <option value="" disabled>
              Select a city
            </option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
      {onCancel && (
        <Button variant="ghost" onClick={onCancel} className="w-fit">
          Cancel
        </Button>
      )}
    </div>
  );
}

function Notice({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-start justify-center gap-3 rounded-lg border bg-white p-5">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-600">{body}</p>
      {children}
    </div>
  );
}
