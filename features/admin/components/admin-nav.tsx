"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  FolderTree,
  History,
  LayoutDashboard,
  Megaphone,
  Scale,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";

import { ADMIN_NAV_LINKS } from "../constants";

const ICON_MAP = {
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
};

type AdminNavProps = {
  isSuperAdmin: boolean;
};

export function AdminNav({ isSuperAdmin }: AdminNavProps) {
  const pathname = usePathname();

  const links = ADMIN_NAV_LINKS.filter((item) => {
    if ("superAdminOnly" in item && item.superAdminOnly) {
      return isSuperAdmin;
    }
    return true;
  });

  return (
    <nav className="border-b border-neutral-200 bg-neutral-50/90 shadow-2xs">
      <div className="mx-auto flex max-w-7xl space-x-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {links.map((link) => {
          const Icon = ICON_MAP[link.icon as keyof typeof ICON_MAP] || LayoutDashboard;
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-green-700 text-white shadow-2xs"
                  : "text-neutral-700 hover:bg-neutral-200/70 hover:text-neutral-900"
              }`}
            >
              <Icon className={`size-4 ${isActive ? "text-white" : "text-neutral-500"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
