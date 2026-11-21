import Link from "next/link";
import { cn } from "cn";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopStatus } from "@/lib/db/schema/enums";
import { formatDate } from "@/lib/time";

import { SHOP_STATUS_COLORS, SHOP_STATUS_LABELS } from "../../constants";
import type { AdminShopListItem } from "../../queries";
import {
  DirectorySearch,
  EmptyState,
  FilterTabs,
  focusRing,
  Pagination,
  ResultsSummary,
} from "../directory";

/** Tab order: the queue first, then the rest. */
const TABS: Array<{ value: ShopStatus | "all"; label: string }> = [
  { value: "pending", label: SHOP_STATUS_LABELS.pending },
  { value: "active", label: SHOP_STATUS_LABELS.active },
  { value: "suspended", label: SHOP_STATUS_LABELS.suspended },
  { value: "draft", label: SHOP_STATUS_LABELS.draft },
  { value: "all", label: "All shops" },
];

export type ShopDirectoryFilters = {
  status?: ShopStatus;
  q: string;
  page: number;
};

export function shopsHref({ status, q, page }: Partial<ShopDirectoryFilters>): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/shops?${query}` : "/admin/shops";
}

// ---------------------------------------------------------------------------
// Filters

export function ShopStatusTabs({
  counts,
  filters,
}: {
  counts: Record<ShopStatus | "all", number>;
  filters: ShopDirectoryFilters;
}) {
  const current = filters.status ?? "all";
  return (
    <FilterTabs
      label="Shop status"
      tabs={TABS.map((tab) => ({
        href: shopsHref({ status: tab.value === "all" ? undefined : tab.value, q: filters.q }),
        label: tab.label,
        count: counts[tab.value],
        active: current === tab.value,
        attention: tab.value === "pending",
      }))}
    />
  );
}

export function ShopSearch({ filters }: { filters: ShopDirectoryFilters }) {
  return (
    <DirectorySearch
      action="/admin/shops"
      id="shop-search"
      label="Search shops"
      placeholder="Shop, owner, email or phone"
      defaultValue={filters.q}
      keep={{ status: filters.status }}
    />
  );
}

// ---------------------------------------------------------------------------
// Results

function StatusChip({ status }: { status: ShopStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        SHOP_STATUS_COLORS[status],
      )}
    >
      {SHOP_STATUS_LABELS[status]}
    </span>
  );
}

function Documents({ shop }: { shop: AdminShopListItem }) {
  const missing = shop.documentsCount === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm whitespace-nowrap",
        missing && shop.status === "pending" ? "font-medium text-amber-800" : "text-neutral-700",
      )}
    >
      <FileText aria-hidden className="size-4 text-current opacity-70" />
      {missing ? "None" : shop.documentsCount}
    </span>
  );
}

const area = (shop: AdminShopListItem) =>
  [shop.cityName, shop.barangayName].filter(Boolean).join(" · ") || "Not set";

const contact = (shop: AdminShopListItem) => shop.ownerEmail || shop.ownerPhone || "No contact";

function ShopTable({ shops }: { shops: AdminShopListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white xl:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Shop
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Owner
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Area
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Documents
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium 2xl:table-cell">
              Registered
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {shops.map((shop) => (
            <tr key={shop.id} className="transition-colors duration-150 hover:bg-neutral-50">
              <td className="max-w-60 px-4 py-3">
                <Link
                  href={`/admin/shops/${shop.id}`}
                  className={cn(
                    "block truncate rounded font-semibold text-navy-900 hover:text-green-700",
                    focusRing,
                  )}
                >
                  {shop.name}
                </Link>
                <p className="truncate text-xs text-neutral-500">/{shop.slug}</p>
              </td>
              <td className="max-w-52 px-4 py-3">
                <p className="truncate text-neutral-900">{shop.ownerName || "No name"}</p>
                <p className="truncate text-xs text-neutral-500">{contact(shop)}</p>
              </td>
              <td className="max-w-48 truncate px-4 py-3 text-neutral-700">{area(shop)}</td>
              <td className="px-4 py-3">
                <Documents shop={shop} />
              </td>
              <td className="hidden px-4 py-3 whitespace-nowrap text-neutral-600 2xl:table-cell">
                {formatDate(shop.createdAt)}
              </td>
              <td className="px-4 py-3">
                <StatusChip status={shop.status} />
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  asChild
                  variant="outline"
                  className={cn(
                    "motion-safe:active:scale-[0.98]",
                    shop.status === "pending" &&
                      "border-green-600 text-green-800 hover:bg-green-50 hover:text-green-900",
                  )}
                >
                  <Link href={`/admin/shops/${shop.id}`}>
                    {shop.status === "pending" ? "Review" : "View"}
                    <span className="sr-only"> {shop.name}</span>
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShopCards({ shops }: { shops: AdminShopListItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
      {shops.map((shop) => (
        <li key={shop.id}>
          <Link
            href={`/admin/shops/${shop.id}`}
            className={cn(
              "block h-full rounded-xl border border-neutral-200 bg-white p-4 transition-[transform,box-shadow] duration-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
              focusRing,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-900">{shop.name}</p>
                <p className="truncate text-xs text-neutral-500">/{shop.slug}</p>
              </div>
              <StatusChip status={shop.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="col-span-2 min-w-0">
                <dt className="sr-only">Owner</dt>
                <dd className="truncate text-neutral-900">
                  {shop.ownerName || "No name"}
                  <span className="text-neutral-500"> · {contact(shop)}</span>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-neutral-500">Area</dt>
                <dd className="truncate text-neutral-700">{area(shop)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Documents</dt>
                <dd>
                  <Documents shop={shop} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="sr-only">Registered</dt>
                <dd className="text-xs text-neutral-500">
                  Registered {formatDate(shop.createdAt)}
                </dd>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyResults({ filters }: { filters: ShopDirectoryFilters }) {
  let title = "No shops yet";
  let body = "Shops appear here as soon as an owner starts registering.";
  if (filters.q) {
    title = `No shops match “${filters.q}”`;
    body = "Check the spelling, or search by owner name, email or phone instead.";
  } else if (filters.page > 1) {
    title = "This page is empty";
    body = "The list is shorter than it was. Go back to the first page.";
  } else if (filters.status === "pending") {
    title = "No shops waiting for review";
    body = "New registrations land here once the owner submits their documents.";
  } else if (filters.status) {
    title = `No ${SHOP_STATUS_LABELS[filters.status].toLowerCase()} shops`;
    body = "Try another tab.";
  }
  const reset =
    filters.q || filters.page > 1
      ? {
          href: shopsHref({ status: filters.status }),
          label: filters.q ? "Clear search" : "First page",
        }
      : undefined;
  return <EmptyState title={title} body={body} reset={reset} />;
}

export function ShopResults({
  shops,
  total,
  pageSize,
  filters,
}: {
  shops: AdminShopListItem[];
  total: number;
  pageSize: number;
  filters: ShopDirectoryFilters;
}) {
  if (shops.length === 0) return <EmptyResults filters={filters} />;

  return (
    <div className="space-y-4">
      <ResultsSummary
        first={(filters.page - 1) * pageSize + 1}
        count={shops.length}
        total={total}
        noun={["shop", "shops"]}
        query={filters.q}
        note={filters.status === "pending" ? "oldest first" : undefined}
      />
      <ShopTable shops={shops} />
      <ShopCards shops={shops} />
      <Pagination
        page={filters.page}
        total={total}
        pageSize={pageSize}
        hrefFor={(page) => shopsHref({ ...filters, page })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading

/** The results area while it loads: table rows from 1280px, cards below. */
export function ShopResultsSkeleton() {
  const rows = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading shops">
      <Skeleton className="h-5 w-48" />
      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white xl:block">
        <div className="h-10 border-b border-neutral-200 bg-neutral-50" />
        <div className="divide-y divide-neutral-100">
          {rows.map((i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="w-56 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="w-44 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="hidden h-4 w-24 2xl:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="ml-auto h-11 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {rows.slice(0, 4).map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-56" />
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
