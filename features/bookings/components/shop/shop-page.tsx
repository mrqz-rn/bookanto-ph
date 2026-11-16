import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ManagedShop } from "@/features/availability/queries";

/** The page heading for a booking page, with a shop switcher when the user has several. */
export function ShopPageHeader({
  title,
  description,
  shop,
  shops,
  path,
}: {
  title: string;
  description: string;
  shop: ManagedShop;
  shops: ManagedShop[];
  path: string;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-navy-900">{title}</h1>
      <p className="mt-1 text-slate-600">
        {description} <span className="font-semibold">{shop.name}</span>
      </p>
      {shops.length > 1 && (
        <nav aria-label="Your shops" className="mt-3 flex flex-wrap gap-2">
          {shops.map((entry) => (
            <Link
              key={entry.shopId}
              href={`${path}?shop=${entry.shopId}`}
              aria-current={entry.shopId === shop.shopId ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
                entry.shopId === shop.shopId
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-border bg-card text-navy-900 hover:border-green-700"
              }`}
            >
              {entry.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function NoShop() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-900">No shop yet</h1>
      <p className="mt-2 text-slate-600">Set up your shop first.</p>
      <Button asChild className="mt-5">
        <Link href="/dashboard/setup">Set up your shop</Link>
      </Button>
    </div>
  );
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div aria-hidden="true">
        <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-5 w-72 max-w-full animate-pulse rounded-md bg-muted" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="mt-4 h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading…
      </p>
    </div>
  );
}
