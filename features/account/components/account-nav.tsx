"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { signOutAction } from "@/features/auth/actions";
import { formatPhone } from "@/lib/phone";
import { ACCOUNT_NAV_ITEMS } from "../constants";

type AccountNavContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
};

const AccountNavContext = React.createContext<AccountNavContextValue | null>(null);

export function AccountPageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading account section" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <Skeleton className="h-6 w-40 rounded-md" />
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-2/3 rounded-lg" />
        </div>
        <div className="pt-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <span className="sr-only">Loading account section…</span>
    </div>
  );
}

export function AccountNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  React.useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => {
      setPendingHref(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const value = React.useMemo(() => ({ pendingHref, setPendingHref }), [pendingHref]);

  return <AccountNavContext.Provider value={value}>{children}</AccountNavContext.Provider>;
}

export function AccountContentSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ctx = React.useContext(AccountNavContext);
  const pendingHref = ctx?.pendingHref ?? null;

  const isNavigating =
    pendingHref !== null && pendingHref !== pathname && !pathname.startsWith(`${pendingHref}/`);

  if (isNavigating) {
    return (
      <div className="animate-in duration-150 fade-in">
        <AccountPageSkeleton />
      </div>
    );
  }

  return <div className="animate-in duration-150 fade-in">{children}</div>;
}

type AccountNavProps = {
  userName?: string | null;
  userPhone?: string | null;
  userEmail?: string | null;
};

export function AccountNav({ userName, userPhone, userEmail }: AccountNavProps) {
  const pathname = usePathname();
  const ctx = React.useContext(AccountNavContext);
  const [localPendingHref, setLocalPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalPendingHref(null);
  }, [pathname]);

  const pendingHref = ctx ? ctx.pendingHref : localPendingHref;
  const setPendingHref = ctx ? ctx.setPendingHref : setLocalPendingHref;
  const activePathname = pendingHref ?? pathname;

  const displayName = userName || userPhone || userEmail || "Valued Customer";
  const contactInfo = (userPhone && formatPhone(userPhone)) || userEmail || "";

  return (
    <div className="lg:space-y-6">
      {/* User greeting card */}
      <div className="hidden items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-5 lg:flex">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xl font-bold text-green-700">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-navy-900">{displayName}</h2>
          {contactInfo && <p className="truncate text-xs text-slate-500">{contactInfo}</p>}
        </div>
      </div>

      {/* Navigation tabs */}
      {/* A pill row on phones and tablets, a list beside the page from 1024px. */}
      <nav
        aria-label="Account navigation"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const isActive =
            activePathname === item.href || activePathname.startsWith(`${item.href}/`);
          const isAlreadyCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                if (
                  e.defaultPrevented ||
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                ) {
                  return;
                }
                if (isAlreadyCurrent) {
                  setPendingHref(null);
                  return;
                }
                setPendingHref(item.href);
              }}
              className={`flex min-h-11 shrink-0 items-center justify-between rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 lg:rounded-lg lg:border-0 lg:py-3 ${
                isActive
                  ? "border-transparent bg-accent font-semibold text-navy-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
              }`}
            >
              <span>{item.label}</span>
              <span aria-hidden className="hidden text-slate-600 lg:inline">
                →
              </span>
            </Link>
          );
        })}

        {/* Sign out button */}
        {/* On phones and tablets, Log out is in the header's account menu. */}
        <form action={signOutAction} className="mt-2 hidden border-t border-border pt-2 lg:block">
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-red-50"
          >
            <span>Log out</span>
            <span aria-hidden="true">🚪</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
