import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CategoryIcon } from "@/components/shared/category-icon";
import { PriceTag } from "@/components/shared/price-tag";
import { Rating } from "@/components/shared/rating";
import { formatDistance } from "@/lib/geo";

export type ShopCardData = {
  id: string;
  slug: string;
  name: string;
  categoryName: string | null;
  categoryIcon: string | null;
  /** "Concepcion Uno, Marikina" */
  place: string | null;
  ratingAvg: number;
  ratingCount: number;
  /** Lowest price among the shop's active services. */
  fromPriceCentavos: number | null;
  photoUrl: string | null;
  verified: boolean;
  /** Set when the list is sorted by distance from the customer. */
  distanceM: number | null;
};

export function ShopCard({ shop }: { shop: ShopCardData }) {
  const details = [shop.categoryName, shop.place].filter(Boolean).join(" · ");

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-xs transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-accent">
        {shop.photoUrl ? (
          <Image
            src={shop.photoUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 70vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <CategoryIcon name={shop.categoryIcon} className="size-12 text-green-700" />
          </div>
        )}
        {shop.verified && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-success">
            <BadgeCheck aria-hidden className="size-3.5" />
            Verified
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="leading-snug font-semibold">
          {/* The link covers the whole card. */}
          <Link
            href={`/shop/${shop.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            {shop.name}
          </Link>
        </h3>
        {details && <p className="line-clamp-1 text-sm text-slate-600">{details}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Rating average={shop.ratingAvg} count={shop.ratingCount} />
          {shop.fromPriceCentavos !== null && (
            <PriceTag centavos={shop.fromPriceCentavos} type="starts_at" className="text-sm" />
          )}
        </div>
        {shop.distanceM !== null && (
          <p className="text-sm text-slate-600">{formatDistance(shop.distanceM)} away</p>
        )}
      </div>
    </article>
  );
}

/** A row of shop cards: swipeable on phones, a grid from 640px. */
export function ShopRail({ shops }: { shops: ShopCardData[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {shops.map((shop) => (
        <li key={shop.id} className="w-[70%] shrink-0 snap-start sm:w-auto">
          <ShopCard shop={shop} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder with the same shape as a ShopRail while it loads. */
export function ShopRailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="w-[70%] shrink-0 sm:w-auto">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-[4/3] animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
