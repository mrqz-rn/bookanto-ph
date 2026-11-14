"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { ACCOUNT_NAV_ITEMS } from "../constants";

type AccountNavProps = {
  userName?: string | null;
  userPhone?: string | null;
  userEmail?: string | null;
};

export function AccountNav({ userName, userPhone, userEmail }: AccountNavProps) {
  const pathname = usePathname();

  const displayName = userName || userPhone || userEmail || "Valued Customer";
  const contactInfo = userPhone || userEmail || "";

  return (
    <div className="space-y-6">
      {/* User greeting card */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xl text-orange-700">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-navy-900">{displayName}</h2>
          {contactInfo && <p className="truncate text-xs text-slate-500">{contactInfo}</p>}
        </div>
      </div>

      {/* Navigation tabs */}
      <nav aria-label="Account navigation" className="flex flex-col gap-1">
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent font-semibold text-navy-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-slate-400">→</span>
            </Link>
          );
        })}

        {/* Sign out button */}
        <form action={signOutAction} className="mt-2 border-t border-border pt-2">
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
