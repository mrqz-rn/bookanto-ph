"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useEffect, useState, useTransition } from "react";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

import type { Viewer } from "../constants";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const under = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const EXPLORE: NavItem = {
  href: "/explore",
  label: "Explore",
  icon: Compass,
  isActive: (p) => under(p, "/explore"),
};
const SEARCH: NavItem = {
  href: "/search",
  label: "Search",
  icon: Search,
  isActive: (p) => under(p, "/search") || under(p, "/c"),
};
const BOOKINGS: NavItem = {
  href: "/account/bookings",
  label: "Bookings",
  icon: CalendarDays,
  isActive: (p) => under(p, "/account/bookings"),
};
const PROFILE: NavItem = {
  href: "/account/profile",
  label: "Profile",
  icon: UserRound,
  isActive: (p) => under(p, "/account") && !under(p, "/account/bookings"),
};

/** The phone tab bar for customers. */
const TABS = [EXPLORE, SEARCH, BOOKINGS, PROFILE];

/** The header words from 768px, per kind of account. */
const HEADER_LINKS: Record<Viewer["kind"], NavItem[]> = {
  customer: [EXPLORE, { ...BOOKINGS, label: "My bookings" }],
  store: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: (p) => under(p, "/dashboard"),
    },
  ],
  admin: [
    { href: "/admin", label: "Admin", icon: ShieldCheck, isActive: (p) => under(p, "/admin") },
    EXPLORE,
  ],
};

const MENU_LINKS: Record<Viewer["kind"], NavItem[]> = {
  customer: [
    { ...BOOKINGS, label: "My bookings" },
    PROFILE,
    {
      href: "/account/addresses",
      label: "Saved addresses",
      icon: MapPin,
      isActive: () => false,
    },
    {
      href: "/account/notifications",
      label: "Notifications",
      icon: Bell,
      isActive: () => false,
    },
  ],
  store: [{ ...HEADER_LINKS.store[0]! }, PROFILE],
  admin: [{ ...HEADER_LINKS.admin[0]! }, PROFILE],
};

type SiteNavProps = {
  /**
   * The signed-in user, null for a guest. Leave it out on pages served from
   * the edge cache: the header then asks /api/me in the browser.
   */
  viewer?: Viewer | null;
  /** Where the logo goes. Defaults to the viewer's home. */
  logoHref?: string;
};

/** The marketplace header, its account menu and the phone tab bar. */
export function SiteNav({ viewer: serverViewer, logoHref }: SiteNavProps) {
  const pathname = usePathname();
  const viewer = useViewer(serverViewer);
  const home =
    viewer?.kind === "store" ? "/dashboard" : viewer?.kind === "admin" ? "/admin" : "/explore";

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link
              href={logoHref ?? home}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <LogoMark className="h-9" />
              <Wordmark className="text-[22px] sm:text-2xl" />
            </Link>
            {viewer && (
              <nav aria-label="Main" className="hidden md:block">
                <ul className="flex items-center gap-1">
                  {HEADER_LINKS[viewer.kind].map((item) => (
                    <li key={item.href}>
                      <HeaderLink item={item} active={item.isActive(pathname)} />
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {viewer === undefined ? (
            <span aria-hidden className="size-11 animate-pulse rounded-full bg-muted" />
          ) : viewer ? (
            <AccountMenu viewer={viewer} pathname={pathname} />
          ) : (
            <Button asChild variant="outline" className="active:scale-[0.98]">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
            </Button>
          )}
        </div>
      </header>

      {viewer?.kind === "customer" && <TabBar pathname={pathname} />}
    </>
  );
}

/** The server's answer when it has one, else the session as /api/me reports it. */
function useViewer(serverViewer: Viewer | null | undefined): Viewer | null | undefined {
  const [fetched, setFetched] = useState<Viewer | null | undefined>(undefined);

  useEffect(() => {
    if (serverViewer !== undefined) return;
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { viewer: null }))
      .then((body: { viewer: Viewer | null }) => setFetched(body.viewer))
      .catch((error: unknown) => {
        // Offline or the request failed: show the guest header.
        if (!(error instanceof DOMException && error.name === "AbortError")) setFetched(null);
      });
    return () => controller.abort();
  }, [serverViewer]);

  return serverViewer !== undefined ? serverViewer : fetched;
}

function HeaderLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:origin-left after:rounded-full after:bg-green-600 after:transition-transform after:duration-200",
        active
          ? "text-navy-900 after:scale-x-100"
          : "text-slate-600 after:scale-x-0 hover:text-navy-900 hover:after:scale-x-100",
      )}
    >
      {item.label}
    </Link>
  );
}

function Avatar({ viewer, className }: { viewer: Viewer; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-display font-bold text-green-700",
        className,
      )}
    >
      {viewer.name.charAt(0).toUpperCase()}
    </span>
  );
}

function AccountMenu({ viewer, pathname }: { viewer: Viewer; pathname: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Account menu for ${viewer.name}`}
        className="group flex min-h-11 items-center gap-2 rounded-full p-0.5 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] data-[state=open]:bg-muted md:pr-3"
      >
        <Avatar viewer={viewer} className="size-10 text-lg" />
        <span className="hidden max-w-36 truncate text-sm font-semibold md:inline">
          {viewer.firstName ?? viewer.name}
        </span>
        <ChevronDown
          aria-hidden
          className="hidden size-4 text-slate-600 transition-transform group-data-[state=open]:rotate-180 md:block"
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-3 px-2 pt-1 pb-3">
            <Avatar viewer={viewer} className="size-11 text-xl" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{viewer.name}</p>
              {viewer.contact && viewer.contact !== viewer.name && (
                <p className="truncate text-sm text-slate-600">{viewer.contact}</p>
              )}
            </div>
          </div>
          <DropdownMenu.Separator className="-mx-2 mb-1 h-px bg-border" />

          {MENU_LINKS[viewer.kind].map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <Link
                href={item.href}
                aria-current={item.isActive(pathname) ? "page" : undefined}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm font-medium outline-none aria-[current=page]:font-semibold aria-[current=page]:text-green-700 data-[highlighted]:bg-accent"
              >
                <item.icon aria-hidden className="size-5 text-slate-600" />
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="-mx-2 my-1 h-px bg-border" />
          <DropdownMenu.Item
            disabled={pending}
            onSelect={(event) => {
              event.preventDefault();
              startTransition(async () => {
                await signOutAction();
              });
            }}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm font-semibold text-danger outline-none data-[disabled]:opacity-60 data-[highlighted]:bg-red-50"
          >
            {pending ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : (
              <LogOut aria-hidden className="size-5" />
            )}
            {pending ? "Logging out…" : "Log out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Explore, search, bookings and profile under the thumb, below 768px. */
function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Marketplace"
      data-tab-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="group flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 group-active:scale-95",
                    active ? "bg-accent text-green-700" : "text-slate-600 group-hover:bg-muted",
                  )}
                >
                  <tab.icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={active ? "text-green-700" : "text-slate-600"}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
