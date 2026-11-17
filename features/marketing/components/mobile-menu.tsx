"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type MobileMenuProps = {
  links: Array<{ href: string; label: string }>;
  action: string;
};

/** Below 1024px: a 44px menu button that opens a full-screen sheet. Any tap on a link closes it. */
export function MobileMenu({ links, action }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mk-menu"
        aria-label="Menu"
        onClick={() => setOpen((value) => !value)}
        className="mk-btn btn btn--secondary nav__toggle mk-btn--tonal size-12 shrink-0 px-0 lg:hidden"
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>
      <div
        id="mk-menu"
        hidden={!open}
        className="fixed inset-x-0 top-[var(--nav)] bottom-0 z-40 overflow-y-auto bg-white lg:hidden"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <nav aria-label="Menu" className="mk-wrap wrap flex flex-col py-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex min-h-14 items-center border-b border-[var(--line)] font-display text-2xl font-bold"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="flex min-h-14 items-center border-b border-[var(--line)] font-display text-2xl font-bold"
          >
            Log in
          </Link>
          <a href="#contact" className="mk-btn btn btn--primary mk-btn--primary mt-6 w-full">
            {action}
          </a>
        </nav>
      </div>
    </>
  );
}
