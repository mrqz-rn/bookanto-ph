"use client";

/// <reference types="google.maps" />

import * as React from "react";

import type { ShopCardData } from "@/components/shared/shop-card";
import { formatPeso } from "@/lib/money";

type Point = { lat: number; lng: number };

let loader: Promise<void> | null = null;

/** Loads the Maps JavaScript API once per page. */
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps?.Map) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const callback = "__bookantoMapsReady";
    (window as unknown as Record<string, () => void>)[callback] = () => resolve();
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      libraries: "marker",
      region: "PH",
      callback,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loader = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.append(script);
  });
  return loader;
}

/** The info window's content, built from DOM nodes so shop names are never parsed as HTML. */
function infoContent(shop: ShopCardData): HTMLElement {
  const box = document.createElement("div");
  box.style.cssText = "font: 14px/1.4 system-ui, sans-serif; max-width: 220px; color: #14213d";
  const link = document.createElement("a");
  link.href = `/shop/${encodeURIComponent(shop.slug)}`;
  link.textContent = shop.name;
  link.style.cssText = "font-weight: 600; color: #15803d";
  box.append(link);
  const details = [
    shop.ratingCount > 0 ? `★ ${shop.ratingAvg.toFixed(1)} (${shop.ratingCount})` : "New",
    shop.fromPriceCentavos !== null ? `from ${formatPeso(shop.fromPriceCentavos)}` : null,
    shop.isOpen ? "Open now" : null,
  ].filter(Boolean);
  const line = document.createElement("div");
  line.textContent = details.join(" · ");
  box.append(line);
  return box;
}

/** Shops on a Google map. Picking a marker shows the shop's name, rating and price. */
export function GoogleShopMap({
  apiKey,
  mapId,
  shops,
  center,
  onFailure,
}: {
  apiKey: string;
  mapId?: string;
  shops: Array<ShopCardData & Point>;
  center: Point | null;
  onFailure: () => void;
}) {
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    const markers: Array<google.maps.Marker | google.maps.marker.AdvancedMarkerElement> = [];

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !container.current) return;
        const map = new google.maps.Map(container.current, {
          center: center ?? shops[0] ?? { lat: 14.5995, lng: 121.0369 },
          zoom: 14,
          mapId,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const info = new google.maps.InfoWindow();
        const bounds = new google.maps.LatLngBounds();

        for (const shop of shops) {
          const position = { lat: shop.lat, lng: shop.lng };
          bounds.extend(position);
          // Advanced markers need a Map ID; plain markers work without one.
          const marker =
            mapId && google.maps.marker?.AdvancedMarkerElement
              ? new google.maps.marker.AdvancedMarkerElement({ map, position, title: shop.name })
              : new google.maps.Marker({ map, position, title: shop.name });
          marker.addListener("click", () => {
            info.setContent(infoContent(shop));
            info.open({ map, anchor: marker });
          });
          markers.push(marker);
        }
        if (center) {
          bounds.extend(center);
          new google.maps.Marker({
            map,
            position: center,
            title: "You",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#14213d",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
        }
        if (shops.length > 1 || center) map.fitBounds(bounds, 48);
      })
      .catch(() => {
        if (!cancelled) onFailure();
      });

    return () => {
      cancelled = true;
      for (const marker of markers) {
        if ("setMap" in marker) marker.setMap(null);
        else marker.map = null;
      }
    };
  }, [apiKey, mapId, shops, center, onFailure]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of the shops in these results"
      className="h-[60vh] min-h-80 w-full overflow-hidden rounded-xl border bg-muted"
    />
  );
}
