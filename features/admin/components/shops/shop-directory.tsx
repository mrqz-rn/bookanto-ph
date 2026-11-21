import Form from "next/form";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopStatus } from "@/lib/db/schema/enums";
import { formatDate } from "@/lib/time";

import { SHOP_STATUS_COLORS, SHOP_STATUS_LABELS } from "../../constants";
import type { AdminShopListItem } from "../../queries";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2";

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
    <nav aria-label="Shop status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
        {TABS.map((tab) => {
          const active = current === tab.value;
          const count = counts[tab.value];
          return (
            <li key={tab.value}>
              <Link
                href={shopsHref({
                  status: tab.value === "all" ? undefined : tab.value,
                  q: filters.q,
                })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm whitespace-nowrap transition-colors duration-150 [@media(pointer:fine)]:min-h-10",
                  focusRing,
                  active
                    ? "bg-white font-semibold text-navy-900 shadow-xs"
                    : "text-neutral-600 hover:bg-white/60 hover:text-navy-900",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums",
                    tab.value === "pending" && count > 0
                      ? "bg-amber-100 text-amber-900"
                      : active
                        ? "bg-neutral-100 text-neutral-700"
                        : "bg-neutral-200/70 text-neutral-600",
                  )}
                >
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ShopSearch({ filters }: { filters: ShopDirectoryFilters }) {
  return (
    <Form
      action="/admin/shops"
      role="search"
      className="flex w-full gap-2 min-[1400px]:w-auto sm:max-w-lg"
    >
      {filters.status && <input type="hidden" name="status" value={filters.status} />}
      <div className="relative min-w-0 flex-1 min-[1400px]:w-80">
        <label htmlFor="shop-search" className="sr-only">
          Search shops
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
        />
        <Input
          id="shop-search"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Shop, owner, email or phone"
          className="h-11 pl-9 text-base sm:text-sm"
          maxLength={100}
        />
      </div>
      <Button type="submit" variant="outline" className="shrink-0">
        Search
      </Button>
    </Form>
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

function Pagination({
  filters,
  total,
  pageSize,
}: {
  filters: ShopDirectoryFilters;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = (page: number, label: string, Icon: typeof ChevronLeft, iconFirst: boolean) => (
    <Button asChild variant="outline">
      <Link href={shopsHref({ ...filters, page })} rel={iconFirst ? "prev" : "next"}>
        {iconFirst && <Icon aria-hidden />}
        {label}
        {!iconFirst && <Icon aria-hidden />}
      </Link>
    </Button>
  );
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <div>{filters.page > 1 && link(filters.page - 1, "Previous", ChevronLeft, true)}</div>
      <p className="text-sm text-neutral-600">
        Page {filters.page} of {pages}
      </p>
      <div>{filters.page < pages && link(filters.page + 1, "Next", ChevronRight, false)}</div>
    </nav>
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
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-navy-900">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
      {(filters.q || filters.page > 1) && (
        <Button asChild variant="outline" className="mt-5">
          <Link href={shopsHref({ status: filters.status })}>
            <X aria-hidden />
            {filters.q ? "Clear search" : "First page"}
          </Link>
        </Button>
      )}
    </div>
  );
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

  const first = (filters.page - 1) * pageSize + 1;
  const last = first + shops.length - 1;
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600" aria-live="polite">
        Showing {first}–{last} of {total} {total === 1 ? "shop" : "shops"}
        {filters.q && <> matching “{filters.q}”</>}
        {filters.status === "pending" && " · oldest first"}
      </p>
      <ShopTable shops={shops} />
      <ShopCards shops={shops} />
      <Pagination filters={filters} total={total} pageSize={pageSize} />
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

/** The filter bar while the page first loads. */
export function ShopFiltersSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:justify-between"
      aria-hidden
    >
      <Skeleton className="h-12 w-full max-w-xl rounded-xl" />
      <Skeleton className="h-11 w-full rounded-md min-[1400px]:w-96 sm:max-w-lg" />
    </div>
  );
}
