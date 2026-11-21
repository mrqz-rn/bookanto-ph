"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { Locate, MapPinOff, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roundCoordinate } from "@/lib/geo";

import { CITY_PRESETS } from "../constants";

// The map (MapLibre + OpenStreetMap) loads only on this step, never on the server.
const OpenPinMap = dynamic(() => import("./open-pin-map").then((mod) => mod.OpenPinMap), {
  ssr: false,
  loading: () => (
    <div className="space-y-3" aria-hidden>
      <div className="h-11 animate-pulse rounded-md bg-muted" />
      <div className="h-80 animate-pulse rounded-xl bg-muted sm:h-96" />
    </div>
  ),
});

type Point = { lat: number; lng: number };

type MapPinPickerProps = {
  lat: number;
  lng: number;
  onChange: (coords: Point) => void;
  /** The address of a picked search result, so the form can prefill it. */
  onAddressFound?: (address: string) => void;
  address?: string;
  error?: string | null;
};

export function MapPinPicker({
  lat,
  lng,
  onChange,
  onAddressFound,
  address,
  error,
}: MapPinPickerProps) {
  const [mapFailed, setMapFailed] = React.useState(false);
  const [geolocating, setGeolocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  const position = React.useMemo(() => ({ lat, lng }), [lat, lng]);
  const onMapFailure = React.useCallback(() => setMapFailed(true), []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Your browser can't share its location. Place the pin on the map instead.");
      return;
    }

    setGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocating(false);
        onChange({
          lat: roundCoordinate(pos.coords.latitude),
          lng: roundCoordinate(pos.coords.longitude),
        });
      },
      () => {
        setGeolocating(false);
        setGeoError("We couldn't get your location. Place the pin on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">
          Drop Pin on Map <span className="text-red-600">*</span>
        </h3>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={geolocating}
          className="text-sm text-navy-900"
        >
          <Locate aria-hidden />
          {geolocating ? "Locating..." : "Use my current location"}
        </Button>
      </div>

      {geoError && (
        <p role="status" className="text-xs text-red-600">
          {geoError}
        </p>
      )}

      {!mapFailed ? (
        <OpenPinMap
          position={position}
          onChange={onChange}
          onAddressFound={onAddressFound}
          onFailure={onMapFailure}
        />
      ) : (
        <div className="flex gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
          <MapPinOff className="mt-0.5 size-5 shrink-0 text-neutral-500" aria-hidden />
          <div className="text-sm text-neutral-700">
            <p className="font-semibold text-neutral-900">The map isn&apos;t available right now</p>
            <p className="mt-1">
              Tap <span className="font-medium">Use my current location</span> while you&apos;re at
              your shop, or enter its coordinates below. In the Google Maps app, press and hold your
              shop&apos;s spot to copy them.
            </p>
          </div>
        </div>
      )}

      {/* Quick city centres */}
      <div>
        <span className="text-xs font-medium text-neutral-600">Jump to city:</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {CITY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange({ lat: preset.lat, lng: preset.lng })}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <Navigation className="size-3.5 text-neutral-400" aria-hidden />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Exact coordinates */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label htmlFor="pin-lat" className="text-xs font-medium text-neutral-600">
            Latitude
          </label>
          <Input
            id="pin-lat"
            type="number"
            inputMode="decimal"
            step="0.000001"
            value={lat || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange({ lat: val, lng });
            }}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <label htmlFor="pin-lng" className="text-xs font-medium text-neutral-600">
            Longitude
          </label>
          <Input
            id="pin-lng"
            type="number"
            inputMode="decimal"
            step="0.000001"
            value={lng || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange({ lat, lng: val });
            }}
            className="mt-1 text-sm"
          />
        </div>
      </div>

      {address && (
        <p className="text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">Selected Address:</span> {address}
        </p>
      )}

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
