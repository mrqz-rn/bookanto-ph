"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  FileText,
  Inbox,
  LayoutGrid,
  ListOrdered,
  SlidersHorizontal,
  Star,
  Store,
  Sun,
  Tag,
  UserRound,
  UserRoundPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

import { getDashboardSkeletonForPath } from "./dashboard-skeletons";

// The shop dashboard's navigation. From 1024px a fixed sidebar holds every
// page in three groups; below it a slim top bar and a bottom tab bar hold the
// four daily pages, and "More" opens a sheet with all of them. A click
// highlights its page and shows that page's skeleton at once, before the
// route has loaded (DashboardNavProvider + DashboardContentSlot).

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const BOOKINGS: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: Sun, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/walk-ins", label: "Walk-ins", icon: UserRoundPlus },
  { href: "/dashboard/queue", label: "Queue", icon: ListOrdered },
  { href: "/dashboard/quotes", label: "Quotes", icon: FileText },
];

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  { label: "Bookings", items: BOOKINGS },
  {
    label: "Shop",
    items: [
      { href: "/dashboard/services", label: "Services & prices", icon: Tag },
      { href: "/dashboard/availability", label: "Availability", icon: CalendarClock },
      { href: "/dashboard/booking-rules", label: "Booking rules", icon: SlidersHorizontal },
      { href: "/dashboard/staff", label: "Staff accounts", icon: Users },
      { href: "/dashboard/setup", label: "Shop details", icon: Store },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/reports", label: "Revenue & stats", icon: BarChart3 },
    ],
  },
];

/** The four daily pages in the phone's bottom bar; "More" holds the rest. */
export const MOBILE_TABS = BOOKINGS.slice(0, 4);

const ACCOUNT: NavItem = { href: "/account", label: "Account", icon: UserRound };

export type DashboardShop = { name: string; status: string; slug: string | null } | null;

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "In review",
  draft: "Draft",
  suspended: "Suspended",
};

function isItemActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isPlainLeftClick(e: React.MouseEvent<HTMLAnchorElement>) {
  return (
    !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
  );
}

type DashboardNavContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
};

const DashboardNavContext = React.createContext<DashboardNavContextValue | null>(null);

export function DashboardNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  // Clear pending state as soon as the route pathname updates
  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Safety timeout in case navigation is interrupted
  React.useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => {
      setPendingHref(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const value = React.useMemo(() => ({ pendingHref, setPendingHref }), [pendingHref]);

  return <DashboardNavContext.Provider value={value}>{children}</DashboardNavContext.Provider>;
}

export function DashboardContentSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ctx = React.useContext(DashboardNavContext);
  const pendingHref = ctx?.pendingHref ?? null;

  const isNavigating =
    pendingHref !== null && pendingHref !== pathname && !pathname.startsWith(`${pendingHref}/`);

  if (isNavigating && pendingHref) {
    return (
      <div className="animate-in duration-150 fade-in">
        {getDashboardSkeletonForPath(pendingHref)}
      </div>
    );
  }

  return <div className="animate-in duration-150 fade-in">{children}</div>;
}

/** Which page is highlighted (the one clicked, before it has loaded) and the click handler. */
function useNavState() {
  const pathname = usePathname();
  const ctx = React.useContext(DashboardNavContext);
  const [localPendingHref, setLocalPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalPendingHref(null);
  }, [pathname]);

  const pendingHref = ctx ? ctx.pendingHref : localPendingHref;
  const setPendingHref = ctx ? ctx.setPendingHref : setLocalPendingHref;
  const activePathname = pendingHref ?? pathname;

  const onNavigate = (item: NavItem) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(e)) return;
    if (isItemActive(pathname, item)) {
      setPendingHref(null);
      return;
    }
    setPendingHref(item.href);
  };

  return { pathname, activePathname, onNavigate };
}

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2";

function NavRow({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        // 44px for touch; 40px under a mouse, so all 13 pages fit a 768px-tall laptop.
        "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors duration-150 [@media(pointer:fine)]:min-h-10",
        focusRing,
        active
          ? "bg-green-50 font-semibold text-green-800"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-navy-900",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-green-600"
        />
      )}
      <Icon
        aria-hidden
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-150",
          active ? "text-green-700" : "text-neutral-500 group-hover:text-neutral-700",
        )}
      />
      {item.label}
    </Link>
  );
}

function NavGroups({
  activePathname,
  onNavigate,
  onAfterClick,
}: {
  activePathname: string;
  onNavigate: (item: NavItem) => (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onAfterClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => {
        const id = `dashboard-nav-${group.label.toLowerCase()}`;
        return (
          <div key={group.label}>
            <p id={id} className="px-3 pb-0.5 text-[13px] font-medium text-neutral-500">
              {group.label}
            </p>
            <ul aria-labelledby={id} className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavRow
                    item={item}
                    active={isItemActive(activePathname, item)}
                    onClick={(e) => {
                      onNavigate(item)(e);
                      onAfterClick?.();
                    }}
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

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-600",
  pending: "bg-amber-500",
  suspended: "bg-red-600",
};

function StatusLine({ status }: { status: string }) {
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-neutral-600">
      <span
        aria-hidden
        className={cn("size-2 rounded-full", STATUS_DOT[status] ?? "bg-neutral-400")}
      />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** The shop being managed: its name, its status and a link to its public page. */
function ShopCard({ shop }: { shop: DashboardShop }) {
  if (!shop) {
    return (
      <Link
        href="/dashboard/setup"
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 text-[15px] font-semibold text-green-800 hover:bg-green-50",
          focusRing,
        )}
      >
        <Store aria-hidden className="size-[18px]" />
        Set up your shop
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-1 pl-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-semibold text-navy-900">{shop.name}</p>
        <StatusLine status={shop.status} />
      </div>
      {shop.slug && (
        <Link
          href={`/shop/${shop.slug}`}
          target="_blank"
          title="View shop page"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-lg text-green-700 transition-colors duration-150 hover:bg-green-50 hover:text-green-800",
            focusRing,
          )}
        >
          <ExternalLink aria-hidden className="size-[18px]" />
          <span className="sr-only">View shop page (opens in a new tab)</span>
        </Link>
      )}
    </div>
  );
}

/** The account page as a 44px round button, beside the logo. */
function AccountButton({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <Link
      href={ACCOUNT.href}
      aria-label="Account"
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-150",
        focusRing,
        active
          ? "bg-green-50 text-green-700"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-navy-900",
        className,
      )}
    >
      <UserRound aria-hidden className="size-5" />
    </Link>
  );
}

/** From 1024px: the fixed sidebar with every page. */
export function DashboardSidebar({ shop = null }: { shop?: DashboardShop }) {
  const { activePathname, onNavigate } = useNavState();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between pr-2 pl-5">
        <Link href="/dashboard" className={cn("flex items-center gap-2 rounded-md", focusRing)}>
          <LogoMark className="h-8" />
          <Wordmark className="text-xl" />
        </Link>
        <AccountButton active={isItemActive(activePathname, ACCOUNT)} />
      </div>
      <div className="px-3">
        <ShopCard shop={shop} />
      </div>
      <nav aria-label="Shop dashboard" className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
        <NavGroups activePathname={activePathname} onNavigate={onNavigate} />
      </nav>
    </aside>
  );
}

/** Below 1024px: the slim top bar with the logo, the shop and the account. */
export function DashboardTopBar({ shop = null }: { shop?: DashboardShop }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white pt-[30px] lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className={cn("flex shrink-0 items-center gap-2 rounded-md", focusRing)}
        >
          <LogoMark className="h-8" />
          <Wordmark className="hidden text-lg sm:inline-flex" />
          <span className="sr-only sm:hidden">BooKanto dashboard</span>
        </Link>
        {shop && (
          <div className="min-w-0 flex-1 border-l border-neutral-200 pl-3">
            <p className="truncate text-[15px] leading-tight font-semibold text-navy-900">
              {shop.name}
            </p>
            <StatusLine status={shop.status} />
          </div>
        )}
        <AccountButton className="ml-auto" />
      </div>
    </header>
  );
}

/** Below 1024px: the bottom tab bar (four daily pages and More). */
export function DashboardMobileNav({ shop = null }: { shop?: DashboardShop }) {
  const { pathname, activePathname, onNavigate } = useNavState();
  const [open, setOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = React.useCallback(() => {
    setOpen(false);
    moreRef.current?.focus();
  }, []);

  const onATab = MOBILE_TABS.some((item) => isItemActive(activePathname, item));

  return (
    <>
      <nav
        aria-label="Shop dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {MOBILE_TABS.map((item) => {
            const active = isItemActive(activePathname, item);
            return (
              <li key={item.href} className="flex">
                <TabButton as="link" item={item} active={active} onClick={onNavigate(item)} />
              </li>
            );
          })}
          <li className="flex">
            <TabButton
              as="button"
              ref={moreRef}
              item={{ href: "#", label: "More", icon: LayoutGrid }}
              active={!onATab || open}
              onClick={() => setOpen(true)}
              expanded={open}
            />
          </li>
        </ul>
      </nav>
      {open && (
        <MoreSheet
          shop={shop}
          activePathname={activePathname}
          onNavigate={onNavigate}
          onClose={close}
        />
      )}
    </>
  );
}

type TabButtonProps =
  | {
      as: "link";
      item: NavItem;
      active: boolean;
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    }
  | {
      as: "button";
      item: NavItem;
      active: boolean;
      onClick: () => void;
      expanded: boolean;
      ref: React.Ref<HTMLButtonElement>;
    };

function TabButton(props: TabButtonProps) {
  const { item, active } = props;
  const Icon = item.icon;
  const className = cn(
    "flex flex-1 flex-col items-center justify-center gap-1 text-[12px] transition-colors duration-150",
    focusRing,
    active ? "font-semibold text-green-800" : "font-medium text-neutral-600 hover:text-navy-900",
  );
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "grid h-7 w-12 place-items-center rounded-full transition-colors duration-150",
          active && "bg-green-50",
        )}
      >
        <Icon className={cn("size-5", active ? "text-green-700" : "text-neutral-500")} />
      </span>
      {item.label}
    </>
  );

  if (props.as === "button") {
    return (
      <button
        ref={props.ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={props.expanded}
        aria-controls="dashboard-more"
        onClick={props.onClick}
        className={className}
      >
        {body}
      </button>
    );
  }
  return (
    <Link
      href={item.href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      onClick={props.onClick}
      className={className}
    >
      {body}
    </Link>
  );
}

/** The sheet behind More: the shop, every page in its group, and the account. */
function MoreSheet({
  shop,
  activePathname,
  onNavigate,
  onClose,
}: {
  shop: DashboardShop;
  activePathname: string;
  onNavigate: (item: NavItem) => (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onClose: () => void;
}) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Keep Tab inside the sheet while it is open.
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div aria-hidden className="absolute inset-0 bg-navy-900/40" onClick={onClose} />
      <div
        ref={sheetRef}
        id="dashboard-more"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-more-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-[20px] bg-white shadow-[0_-12px_40px_-12px_rgb(20_33_61/0.35)]"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p id="dashboard-more-title" className="font-display text-xl font-bold text-navy-900">
            All pages
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "grid size-11 place-items-center rounded-full text-neutral-700 hover:bg-neutral-100",
              focusRing,
            )}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <ShopCard shop={shop} />
          <nav aria-label="All dashboard pages" className="mt-4">
            <NavGroups
              activePathname={activePathname}
              onNavigate={onNavigate}
              onAfterClick={onClose}
            />
          </nav>
          <div className="mt-4 border-t border-neutral-200 pt-3">
            <NavRow
              item={ACCOUNT}
              active={isItemActive(activePathname, ACCOUNT)}
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
