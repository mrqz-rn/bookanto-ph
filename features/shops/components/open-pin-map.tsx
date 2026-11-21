"use client";

import * as React from "react";
import { ExternalLink, Search } from "lucide-react";
import { Map as MapLibreMap, Marker, NavigationControl, type LngLat } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roundCoordinate } from "@/lib/geo";
import { OPEN_MAP_STYLE_URL, searchPlaces, streetViewUrl, type PlaceResult } from "@/lib/open-map";

type Point = { lat: number; lng: number };

/** Kanto Green (green-600) for the shop pin. */
const PIN_COLOR = "#16a34a";

const toPoint = (lngLat: LngLat): Point => ({
  lat: roundCoordinate(lngLat.lat),
  lng: roundCoordinate(lngLat.lng),
});

const samePoint = (a: Point, b: Point) =>
  Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;

type OpenPinMapProps = {
  position: Point;
  onChange: (point: Point) => void;
  /** Called with the place's address when the owner picks a search result. */
  onAddressFound?: (address: string) => void;
  /** The map couldn't start (no WebGL, or the map style failed to load). */
  onFailure: () => void;
};

/**
 * An OpenStreetMap map for placing the shop's pin: search for a place, tap the
 * map or drag the pin. Street View opens in Google Maps through a plain link.
 */
export function OpenPinMap({ position, onChange, onAddressFound, onFailure }: OpenPinMapProps) {
  const mapElement = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const markerRef = React.useRef<Marker | null>(null);
  const [ready, setReady] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<PlaceResult[] | null>(null);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const searchAbort = React.useRef<AbortController | null>(null);

  // The map is built once; these refs give its listeners the latest props.
  const initialPosition = React.useRef(position);
  const callbacks = React.useRef({ onChange, onFailure });
  React.useEffect(() => {
    callbacks.current = { onChange, onFailure };
  });

  React.useEffect(() => {
    if (!mapElement.current) return;
    const start = initialPosition.current;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: mapElement.current,
        style: OPEN_MAP_STYLE_URL,
        center: [start.lng, start.lat],
        zoom: 16,
        // One finger scrolls the page; two fingers (or Ctrl + scroll) move the map.
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
    } catch {
      // No WebGL on this device.
      callbacks.current.onFailure();
      return;
    }

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    const marker = new Marker({ color: PIN_COLOR, draggable: true })
      .setLngLat([start.lng, start.lat])
      .addTo(map);

    const place = (point: Point) => {
      marker.setLngLat([point.lng, point.lat]);
      callbacks.current.onChange(point);
    };
    marker.on("dragend", () => place(toPoint(marker.getLngLat())));
    map.on("click", (event) => place(toPoint(event.lngLat)));

    let loaded = false;
    map.once("load", () => {
      loaded = true;
      setReady(true);
    });
    // Tile hiccups after loading are fine; a style that never loads is not.
    map.on("error", () => {
      if (!loaded) callbacks.current.onFailure();
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Follow pin changes made outside the map (current location, city shortcuts, typed coordinates).
  React.useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (samePoint(toPoint(marker.getLngLat()), position)) return;
    marker.setLngLat([position.lng, position.lat]);
    map.easeTo({ center: [position.lng, position.lat] });
  }, [position]);

  React.useEffect(() => () => searchAbort.current?.abort(), []);

  const runSearch = async () => {
    const text = query.trim();
    if (text.length < 3) {
      setSearchError("Type at least 3 letters.");
      return;
    }
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchPlaces(text, controller.signal);
      setResults(found);
    } catch {
      if (!controller.signal.aborted) {
        setResults(null);
        setSearchError("Search isn't working right now. Move the pin on the map instead.");
      }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  const pickResult = (result: PlaceResult) => {
    const point = { lat: roundCoordinate(result.lat), lng: roundCoordinate(result.lng) };
    markerRef.current?.setLngLat([point.lng, point.lat]);
    mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 18 });
    onChange(point);
    onAddressFound?.(result.label);
    setResults(null);
  };

  return (
    <div className="space-y-3">
      {/* Search runs on submit only (Nominatim's usage policy). Not a <form>: this sits inside the step's form. */}
      <div>
        <label htmlFor="place-search" className="mb-1.5 block text-sm font-medium text-neutral-700">
          Search for your street, barangay or landmark
        </label>
        <div className="flex gap-2">
          <Input
            id="place-search"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="e.g. J.P. Rizal St, Marikina"
            className="text-base"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void runSearch()}
            disabled={searching}
            aria-label="Search"
            className="shrink-0"
          >
            <Search aria-hidden />
            <span className="hidden sm:inline">{searching ? "Searching..." : "Search"}</span>
          </Button>
        </div>

        {searchError && (
          <p role="status" className="mt-1.5 text-xs text-red-600">
            {searchError}
          </p>
        )}

        {results && (
          <div className="mt-2 rounded-lg border border-neutral-200 bg-white">
            {results.length === 0 ? (
              <p role="status" className="p-3 text-sm text-neutral-600">
                No places found. Try a street or barangay name, or move the pin on the map.
              </p>
            ) : (
              <ul aria-label="Search results" className="divide-y divide-neutral-100">
                {results.map((result) => (
                  <li key={`${result.lat},${result.lng},${result.label}`}>
                    <button
                      type="button"
                      onClick={() => pickResult(result)}
                      className="block min-h-11 w-full px-3 py-2.5 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={mapElement}
          role="region"
          aria-label="Map. Tap the map or drag the pin to your shop's exact spot."
          className="h-80 w-full overflow-hidden rounded-xl border border-neutral-300 bg-muted sm:h-96"
        />
        {!ready && (
          <div aria-hidden className="absolute inset-0 animate-pulse rounded-xl bg-muted" />
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-600">
          Tap the map or drag the pin. Use two fingers to move the map.
        </p>
        <Button asChild variant="outline" className="text-navy-900">
          <a href={streetViewUrl(position)} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden />
            Check in Street View
          </a>
        </Button>
      </div>
    </div>
  );
}
