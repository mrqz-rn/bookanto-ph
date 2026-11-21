"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateShopLocation } from "../actions";
import { MapPinPicker } from "./map-pin-picker";

type CityWithBarangays = {
  id: string;
  name: string;
  slug: string;
  barangays: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type StepLocationProps = {
  shopId: string;
  initialAddress?: string | null;
  initialCityId?: string | null;
  initialBarangayId?: string | null;
  initialLat?: number | null;
  initialLng?: number | null;
  cities: CityWithBarangays[];
  onBack: () => void;
  onComplete: () => void;
};

export function StepLocation({
  shopId,
  initialAddress = "",
  initialCityId = "",
  initialBarangayId = "",
  initialLat = 14.6507, // Default Marikina
  initialLng = 121.1029,
  cities,
  onBack,
  onComplete,
}: StepLocationProps) {
  const [address, setAddress] = React.useState(initialAddress || "");
  const [cityId, setCityId] = React.useState(initialCityId || "");
  const [barangayId, setBarangayId] = React.useState(initialBarangayId || "");
  const [coords, setCoords] = React.useState({
    lat: initialLat || 14.6507,
    lng: initialLng || 121.1029,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedCity = cities.find((c) => c.id === cityId);
  const availableBarangays = selectedCity?.barangays || [];

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCityId = e.target.value;
    setCityId(newCityId);
    setBarangayId(""); // reset barangay
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address || address.trim().length < 5) {
      setError("Please enter a complete street address.");
      return;
    }

    setLoading(true);

    try {
      const result = await updateShopLocation({
        shopId,
        address: address.trim(),
        cityId: cityId || null,
        barangayId: barangayId || null,
        lat: coords.lat,
        lng: coords.lng,
      });

      if (result.ok) {
        onComplete();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Could not save location. Please try again.");
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

      {/* Street Address */}
      <div>
        <label htmlFor="street-address" className="block text-sm font-semibold text-neutral-900">
          Complete Street Address <span className="text-red-600">*</span>
        </label>
        <p className="mt-0.5 text-xs text-neutral-500">
          House / Unit number, building name, street name, and nearby landmark.
        </p>
        <Input
          id="street-address"
          type="text"
          required
          minLength={5}
          maxLength={300}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 123 J.P. Rizal St., near Concepcion Church"
          className="mt-1.5"
        />
      </div>

      {/* City & Barangay */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city-select" className="block text-sm font-semibold text-neutral-900">
            City / Municipality
          </label>
          <select
            id="city-select"
            value={cityId}
            onChange={handleCityChange}
            className="mt-1.5 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus-visible:border-neutral-950 focus-visible:ring-1 focus-visible:ring-neutral-950"
          >
            <option value="">Select city...</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="barangay-select" className="block text-sm font-semibold text-neutral-900">
            Barangay
          </label>
          <select
            id="barangay-select"
            value={barangayId}
            disabled={!cityId || availableBarangays.length === 0}
            onChange={(e) => setBarangayId(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus-visible:border-neutral-950 focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:opacity-50"
          >
            <option value="">Select barangay...</option>
            {availableBarangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Map Pin Dropper */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 sm:p-5">
        <MapPinPicker
          lat={coords.lat}
          lng={coords.lng}
          onChange={(newCoords) => setCoords(newCoords)}
          // Prefill from a search result, but never overwrite what the owner typed.
          onAddressFound={(found) => setAddress((current) => (current.trim() ? current : found))}
          address={address}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse justify-between gap-3 pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          ← Back to Details
        </Button>
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Saving location..." : "Save & Continue to Hours →"}
        </Button>
      </div>
    </form>
  );
}
