import Form from "next/form";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// Shared parts of the admin list pages (shops, bookings): filter tabs with
// counts, a search box, pagination and the empty state.

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2";

export type FilterTab = {
  href: string;
  label: string;
  count: number;
  active: boolean;
  /** Amber count: work is waiting in this tab. */
  attention?: boolean;
};

export function FilterTabs({ label, tabs }: { label: string; tabs: FilterTab[] }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm whitespace-nowrap transition-colors duration-150 [@media(pointer:fine)]:min-h-10",
                focusRing,
                tab.active
                  ? "bg-white font-semibold text-navy-900 shadow-xs"
                  : "text-neutral-600 hover:bg-white/60 hover:text-navy-900",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums",
                  tab.attention && tab.count > 0
                    ? "bg-amber-100 text-amber-900"
                    : tab.active
                      ? "bg-neutral-100 text-neutral-700"
                      : "bg-neutral-200/70 text-neutral-600",
                )}
              >
                {tab.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DirectorySearch({
  action,
  id,
  label,
  placeholder,
  defaultValue,
  keep,
}: {
  action: string;
  id: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  /** Other filters to carry into the search, as hidden fields. */
  keep?: Record<string, string | undefined>;
}) {
  return (
    <Form action={action} role="search" className="flex w-full gap-2 sm:max-w-lg 2xl:w-auto">
      {Object.entries(keep ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <div className="relative min-w-0 flex-1 2xl:w-80">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
        />
        <Input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
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

/** Tabs and search: side by side only where both fit whole. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
      {children}
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <div>
        {page > 1 && (
          <Button asChild variant="outline">
            <Link href={hrefFor(page - 1)} rel="prev">
              <ChevronLeft aria-hidden />
              Previous
            </Link>
          </Button>
        )}
      </div>
      <p className="text-sm text-neutral-600">
        Page {page} of {pages}
      </p>
      <div>
        {page < pages && (
          <Button asChild variant="outline">
            <Link href={hrefFor(page + 1)} rel="next">
              Next
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}

export function ResultsSummary({
  first,
  count,
  total,
  noun,
  query,
  note,
}: {
  first: number;
  count: number;
  total: number;
  noun: [singular: string, plural: string];
  query?: string;
  note?: string;
}) {
  return (
    <p className="text-sm text-neutral-600" aria-live="polite">
      Showing {first}–{first + count - 1} of {total} {total === 1 ? noun[0] : noun[1]}
      {query && <> matching “{query}”</>}
      {note && ` · ${note}`}
    </p>
  );
}

export function EmptyState({
  title,
  body,
  reset,
}: {
  title: string;
  body: string;
  reset?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-navy-900">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
      {reset && (
        <Button asChild variant="outline" className="mt-5">
          <Link href={reset.href}>
            <X aria-hidden />
            {reset.label}
          </Link>
        </Button>
      )}
    </div>
  );
}

/** The heading, tabs and search while a list page first loads. */
export function DirectoryHeaderSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <FilterBar>
        <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-11 w-full rounded-md sm:max-w-lg 2xl:w-96" />
      </FilterBar>
    </div>
  );
}
