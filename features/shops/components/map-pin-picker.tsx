"use client";

import * as React from "react";
import { Locate, MapPin, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CITY_PRESETS } from "../constants";

type MapPinPickerProps = {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  address?: string;
  error?: string | null;
};

export function MapPinPicker({ lat, lng, onChange, address, error }: MapPinPickerProps) {
  const [geolocating, setGeolocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  // Approximate Philippine bounding box coordinates for map visualization
  // Metro Manila area defaults around lat 14.5 to 14.7, lng 120.9 to 121.2
  const mapRef = React.useRef<HTMLDivElement>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocating(false);
        onChange({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      (err) => {
        setGeolocating(false);
        setGeoError(
          err.message || "Could not retrieve your location. Please drop the pin manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Map percentage to Metro Manila bounding region
    const percentX = Math.max(0, Math.min(1, x / rect.width));
    const percentY = Math.max(0, Math.min(1, y / rect.height));

    // Approximate Metro Manila bounds:
    // Lat: 14.75 (north) to 14.50 (south)
    // Lng: 120.95 (west) to 121.15 (east)
    const newLat = 14.75 - percentY * (14.75 - 14.5);
    const newLng = 120.95 + percentX * (121.15 - 120.95);

    onChange({
      lat: Number(newLat.toFixed(6)),
      lng: Number(newLng.toFixed(6)),
    });
  };

  // Calculate pin position on visual map (percentage)
  const pinX = Math.max(5, Math.min(95, ((lng - 120.95) / (121.15 - 120.95)) * 100));
  const pinY = Math.max(5, Math.min(95, ((14.75 - lat) / (14.75 - 14.5)) * 100));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-neutral-900">
          Drop Pin on Map <span className="text-red-600">*</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={geolocating}
          className="text-xs text-navy-900"
        >
          <Locate className="mr-1.5 size-3.5" />
          {geolocating ? "Locating..." : "Use my current location"}
        </Button>
      </div>

      {geoError && <p className="text-xs text-red-600">{geoError}</p>}

      {/* Interactive Map Box */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        className="relative h-64 w-full cursor-crosshair overflow-hidden rounded-xl border border-neutral-300 bg-emerald-50/40 shadow-inner"
        style={{
          backgroundImage: `
            radial-gradient(#10b981 0.75px, transparent 0.75px),
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px, 48px 48px, 48px 48px",
        }}
        role="region"
        aria-label="Interactive map pin area. Click anywhere to reposition the pin."
      >
        {/* Landmarks / Water styling for visual feel */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-blue-100/40 to-transparent" />
        <div className="pointer-events-none absolute top-4 left-4 rounded bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-xs backdrop-blur-xs">
          Metro Manila Map View
        </div>

        {/* Pin marker */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full transition-all duration-150"
          style={{ left: `${pinX}%`, top: `${pinY}%` }}
        >
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
              <MapPin className="size-3 text-orange-500" />
              <span>Shop Pin</span>
            </div>
            <div className="-mt-1 size-3 rotate-45 bg-navy-900" />
            <div className="size-2 rounded-full bg-orange-500 ring-4 ring-orange-400/30" />
          </div>
        </div>

        {/* Instruction tip */}
        <div className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/70 px-2.5 py-1 text-[10px] text-white">
          Click anywhere to move pin
        </div>
      </div>

      {/* Quick City Presets */}
      <div>
        <span className="text-xs font-medium text-neutral-600">Quick center:</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CITY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange({ lat: preset.lat, lng: preset.lng })}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <Navigation className="size-3 text-neutral-400" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Exact Coordinate Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-xs font-medium text-neutral-600">Latitude</label>
          <Input
            type="number"
            step="0.000001"
            value={lat || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange({ lat: val, lng });
            }}
            className="mt-1 h-9 text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-600">Longitude</label>
          <Input
            type="number"
            step="0.000001"
            value={lng || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange({ lat, lng: val });
            }}
            className="mt-1 h-9 text-xs"
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
