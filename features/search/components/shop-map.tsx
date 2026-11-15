"use client";

import { MapPin, Navigation, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { PriceTag } from "@/components/shared/price-tag";
import type { ShopCardData } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";

type Props = {
  shops: ShopCardData[];
  userLat?: number;
  userLng?: number;
};

// Default center: Metro Manila
const DEFAULT_CENTER = { lat: 14.5995, lng: 121.0369 };

export function ShopMap({ shops, userLat, userLng }: Props) {
  const [selectedShop, setSelectedShop] = React.useState<ShopCardData | null>(null);

  // Compute bounds or center
  const shopsWithCoords = shops.filter((s) => s.lat != null && s.lng != null);

  const center = React.useMemo(() => {
    if (userLat != null && userLng != null) return { lat: userLat, lng: userLng };
    if (shopsWithCoords.length > 0) {
      const avgLat =
        shopsWithCoords.reduce((sum, s) => sum + (s.lat ?? 0), 0) / shopsWithCoords.length;
      const avgLng =
        shopsWithCoords.reduce((sum, s) => sum + (s.lng ?? 0), 0) / shopsWithCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    return DEFAULT_CENTER;
  }, [shopsWithCoords, userLat, userLng]);

  // Rough projection into 0-100% box around the center (+/- 0.15 deg ~ 16 km)
  const span = 0.25;

  const toPercent = (lat: number, lng: number) => {
    const x = ((lng - (center.lng - span / 2)) / span) * 100;
    const y = ((center.lat + span / 2 - lat) / span) * 100;
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`,
    };
  };

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border bg-slate-100 sm:h-[580px]">
      {/* Background map styling */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />

      {/* Center indicator if customer provided location */}
      {userLat != null && userLng != null && (
        <div
          style={toPercent(userLat, userLng)}
          className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          title="Your location"
        >
          <div className="ring-opacity-60 size-4 animate-pulse rounded-full bg-blue-600 ring-4 ring-blue-300" />
        </div>
      )}

      {/* Shop Markers */}
      {shopsWithCoords.map((shop) => {
        const isSelected = selectedShop?.id === shop.id;
        const pos = toPercent(shop.lat!, shop.lng!);

        return (
          <button
            key={shop.id}
            type="button"
            onClick={() => setSelectedShop(shop)}
            style={pos}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${
              isSelected ? "z-30 scale-125" : "z-20 hover:scale-110"
            }`}
            aria-label={`View ${shop.name} on map`}
          >
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-md transition-colors ${
                isSelected
                  ? "bg-green-700 text-white ring-2 ring-white"
                  : "border border-slate-300 bg-white text-navy-900 hover:bg-green-50"
              }`}
            >
              <MapPin className={`size-3.5 ${isSelected ? "text-white" : "text-green-600"}`} />
              <span className="max-w-[100px] truncate">{shop.name}</span>
            </div>
          </button>
        );
      })}

      {/* No Coordinates Fallback */}
      {shopsWithCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          <div className="rounded-xl border border-border bg-white/90 p-6 shadow-sm backdrop-blur-xs">
            <Navigation className="mx-auto size-8 text-slate-600" />
            <p className="mt-2 text-sm font-semibold text-navy-900">
              Map view available for shops with location
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Switch back to grid view to browse all results.
            </p>
          </div>
        </div>
      )}

      {/* Selected Shop Preview Floating Card */}
      {selectedShop && (
        <div className="absolute right-4 bottom-4 left-4 z-40 max-w-sm rounded-xl border border-border bg-white p-3 shadow-xl sm:left-auto">
          <button
            type="button"
            onClick={() => setSelectedShop(null)}
            className="absolute top-2 right-2 rounded-full p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close shop preview"
          >
            <X className="size-4" />
          </button>

          <div className="flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-accent">
              {selectedShop.photoUrl ? (
                <Image
                  src={selectedShop.photoUrl}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <CategoryIcon
                    name={selectedShop.categoryIcon}
                    className="size-8 text-green-700"
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate font-semibold text-navy-900">{selectedShop.name}</h4>
              <p className="truncate text-xs text-slate-600">
                {[selectedShop.categoryName, selectedShop.place].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-800">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {selectedShop.ratingAvg > 0 ? selectedShop.ratingAvg.toFixed(1) : "New"}
                </span>
                {selectedShop.fromPriceCentavos !== null && (
                  <PriceTag
                    centavos={selectedShop.fromPriceCentavos}
                    type="starts_at"
                    className="text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" className="h-8 w-full text-xs">
              <Link href={`/shop/${selectedShop.slug}`}>View Shop & Book</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
