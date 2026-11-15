import Link from "next/link";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { href: "#features", label: "Features" },
  { href: "#mobile", label: "Mobile App" },
  { href: "#pricing", label: "Pricing" },
  { href: "#investors", label: "Investors" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md">
          <LogoMark className="h-10" />
          <Wordmark className="text-2xl" />
        </Link>
        <nav aria-label="Page sections" className="hidden items-center gap-1 lg:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-accent hover:text-navy-900"
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <a href="#contact">Contact us</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
