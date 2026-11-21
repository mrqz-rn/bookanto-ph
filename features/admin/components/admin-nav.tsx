"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ExternalLink,
  FolderTree,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { signOutAction } from "@/features/auth/actions";

import { ADMIN_NAV_GROUPS, type AdminNavBadge, type AdminNavItem } from "../constants";

const ICONS = {
  LayoutDashboard,
  BarChart3,
  Store,
  FolderTree,
  Users,
  Calendar,
  Scale,
  Megaphone,
  ShieldAlert,
  History,
} satisfies Record<AdminNavItem["icon"], unknown>;

const BADGE_LABEL: Record<AdminNavBadge, string> = {
  pendingShops: "waiting for review",
  openReports: "open",
  activeFraud: "active",
};

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2";

export type AdminNavUser = {
  name: string | null;
  email: string | null;
  isSuperAdmin: boolean;
};

type AdminNavProps = {
  user: AdminNavUser;
  counts: Record<AdminNavBadge, number>;
};

function isActive(pathname: string, item: AdminNavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function visibleGroups(isSuperAdmin: boolean) {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  })).filter((group) => group.items.length > 0);
}

function RoleChip({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">
      <ShieldCheck aria-hidden className="size-3.5 text-green-700" />
      {isSuperAdmin ? "Super admin" : "Admin"}
    </span>
  );
}

function NavRow({
  item,
  active,
  count,
}: {
  item: AdminNavItem;
  active: boolean;
  count: number | null;
}) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // 44px for touch; 40px under a mouse so all ten pages fit a laptop screen.
        "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-[background-color,color,transform] duration-150 [@media(pointer:fine)]:min-h-10",
        "motion-safe:active:scale-[0.98]",
        focusRing,
        active
          ? "bg-green-50 font-semibold text-green-800"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-navy-900",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2.5 left-0 w-[3px] origin-center rounded-full bg-green-600 transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0",
        )}
      />
      <Icon
        aria-hidden
        className={cn(
          "size-[18px] shrink-0 transition-[color,transform] duration-150",
          active
            ? "text-green-700"
            : "text-neutral-500 group-hover:text-neutral-700 motion-safe:group-hover:translate-x-0.5",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count !== null && count > 0 && (
        <span className="min-w-6 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-xs font-semibold text-amber-900 tabular-nums">
          {count > 99 ? "99+" : count}
          <span className="sr-only"> {item.badge ? BADGE_LABEL[item.badge] : ""}</span>
        </span>
      )}
    </Link>
  );
}

function NavGroups({ user, counts, pathname }: AdminNavProps & { pathname: string }) {
  return (
    <div className="flex flex-col gap-5">
      {visibleGroups(user.isSuperAdmin).map((group) => {
        const id = `admin-nav-${group.label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
        return (
          <div key={group.label}>
            <p id={id} className="px-3 pb-1 text-[13px] font-medium text-neutral-500">
              {group.label}
            </p>
            <ul aria-labelledby={id} className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavRow
                    item={item}
                    active={isActive(pathname, item)}
                    count={item.badge ? counts[item.badge] : null}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AccountPanel({ user }: { user: AdminNavUser }) {
  return (
    <div className="space-y-1 border-t border-neutral-200 pt-3">
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-semibold text-navy-900">
          {user.name || "Administrator"}
        </p>
        {user.email && <p className="truncate text-xs text-neutral-500">{user.email}</p>}
      </div>
      <Link
        href="/"
        target="_blank"
        rel="noopener"
        className={cn(
          "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-navy-900 [@media(pointer:fine)]:min-h-10",
          focusRing,
        )}
      >
        <ExternalLink aria-hidden className="size-4 text-neutral-500" />
        View the live site
        <span className="sr-only">(opens in a new tab)</span>
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-neutral-700 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 motion-safe:active:scale-[0.98] [@media(pointer:fine)]:min-h-10",
            focusRing,
          )}
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

/** From 1024px: every page in a grouped sidebar, the account at its foot. */
export function AdminSidebar({ user, counts }: AdminNavProps) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
      <div className="flex h-16 shrink-0 flex-col justify-center gap-1 px-5">
        <Link href="/admin" className={cn("flex items-center gap-2 rounded-md", focusRing)}>
          <LogoMark className="h-7" />
          <Wordmark className="text-lg" />
        </Link>
      </div>
      <div className="px-5 pb-2">
        <RoleChip isSuperAdmin={user.isSuperAdmin} />
      </div>
      <nav aria-label="Admin console" className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
        <NavGroups user={user} counts={counts} pathname={pathname} />
      </nav>
      <div className="px-3 pb-4">
        <AccountPanel user={user} />
      </div>
    </aside>
  );
}

/**
 * Below 1024px: a slim bar naming the current page. Tapping it opens every
 * page in a full-screen menu.
 */
export function AdminTopBar({ user, counts }: AdminNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const current =
    visibleGroups(user.isSuperAdmin)
      .flatMap((group) => group.items)
      .find((item) => isActive(pathname, item)) ?? null;
  const CurrentIcon = current ? ICONS[current.icon] : LayoutDashboard;
  const waiting = counts.pendingShops + counts.openReports + counts.activeFraud;

  // Close after navigating.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // Keep Tab inside the menu while it covers the page.
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link
            href="/admin"
            aria-label="Admin overview"
            className={cn("grid size-11 shrink-0 place-items-center rounded-md", focusRing)}
          >
            <LogoMark className="h-8" />
          </Link>
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="admin-menu"
            onClick={() => setOpen(true)}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-left text-[15px] font-semibold text-navy-900 transition-colors duration-150 hover:bg-neutral-50 motion-safe:active:scale-[0.99]",
              focusRing,
            )}
          >
            <CurrentIcon aria-hidden className="size-[18px] shrink-0 text-green-700" />
            <span className="min-w-0 flex-1 truncate">
              <span className="sr-only">Admin menu. Current page: </span>
              {current?.label ?? "Admin console"}
            </span>
            {waiting > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 tabular-nums">
                {waiting > 99 ? "99+" : waiting}
                <span className="sr-only"> items waiting</span>
              </span>
            )}
            <ChevronDown aria-hidden className="size-4 shrink-0 text-neutral-500" />
          </button>
        </div>
      </header>

      {open && (
        <div
          ref={dialogRef}
          id="admin-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Wordmark className="text-lg" />
              <RoleChip isSuperAdmin={user.isSuperAdmin} />
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className={cn(
                "grid size-11 place-items-center rounded-lg text-neutral-700 transition-colors duration-150 hover:bg-neutral-100",
                focusRing,
              )}
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <nav aria-label="Admin console" className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <NavGroups user={user} counts={counts} pathname={pathname} />
          </nav>
          <div className="px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5">
            <AccountPanel user={user} />
          </div>
        </div>
      )}
    </>
  );
}
