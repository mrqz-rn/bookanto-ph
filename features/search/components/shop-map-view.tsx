"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { ShopCard, type ShopCardData } from "@/components/shared/shop-card";

import { ShopMap } from "./shop-map";

// Loaded only when someone opens the map view, never on the server (plan:
// "Map: loaded only when the user taps Map").
const GoogleShopMap = dynamic(() => import("./google-shop-map").then((mod) => mod.GoogleShopMap), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="h-[60vh] min-h-80 w-full animate-pulse rounded-xl bg-muted" />
  ),
});

/**
 * The map view of search results: a Google map when an API key is set, the
 * simple drawn map otherwise (or if Google Maps fails to load). The shops are
 * also listed below, so the results work without the map.
 */
export function ShopMapView({
  shops,
  center,
}: {
  shops: ShopCardData[];
  center: { lat: number; lng: number } | null;
}) {
  // Read directly (not via lib/public-env) so Zod stays out of the browser bundle.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [googleFailed, setGoogleFailed] = React.useState(false);
  const onFailure = React.useCallback(() => setGoogleFailed(true), []);
  const located = React.useMemo(
    () =>
      shops.filter(
        (shop): shop is ShopCardData & { lat: number; lng: number } =>
          typeof shop.lat === "number" && typeof shop.lng === "number",
      ),
    [shops],
  );

  return (
    <div className="flex flex-col gap-4">
      {apiKey && !googleFailed ? (
        <GoogleShopMap
          apiKey={apiKey}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined}
          shops={located}
          center={center}
          onFailure={onFailure}
        />
      ) : (
        <ShopMap shops={located} userLat={center?.lat} userLng={center?.lng} />
      )}
      {located.length < shops.length && (
        <p className="text-sm text-slate-600">
          {shops.length - located.length} of these shops haven&apos;t set a map pin yet.
        </p>
      )}
      <h2 className="sr-only">Shops on the map</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {shops.map((shop) => (
          <li key={shop.id}>
            <ShopCard shop={shop} />
          </li>
        ))}
      </ul>
    </div>
  );
}
