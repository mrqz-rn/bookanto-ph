import Link from "next/link";

import { LogoMark } from "@/components/shared/logo";
import { SITE_TAGLINE } from "@/lib/seo";
import { formatManila } from "@/lib/time";

import { LiquidWordmark } from "./liquid-wordmark";

const LINKS = [
  { href: "#inbox", label: "Features" },
  { href: "#modes", label: "Booking types" },
  { href: "#pricing", label: "Pricing" },
  { href: "#mobile", label: "App" },
  { href: "#faq", label: "FAQ" },
  { href: "#investors", label: "Investors" },
  { href: "/explore", label: "Explore shops" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

/**
 * The footer, on Gabi Navy: details only. The directory (what BooKanto is and
 * the page's links), the name set across the wrap, then the legal row. The
 * pilot sign-up lives in the contact section just above it.
 */
export function MarketingFooter() {
  return (
    <footer className="mk mk-ground-navy mk-footer footer pt-16 pb-8 lg:pt-24 lg:pb-10">
      <div className="mk-wrap wrap flex flex-col gap-12 lg:gap-16">
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 flex items-center gap-4 lg:col-span-5 lg:items-start">
            <LogoMark className="h-12 rounded-[13px] ring-1 ring-white/20" />
            <p className="max-w-[38ch] text-[16px] leading-relaxed text-white/80">
              Online booking for barbershops, salons and local service shops in the Philippines.
            </p>
          </div>
          <nav aria-label="Footer" className="col-span-12 lg:col-span-6 lg:col-start-7">
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              {LINKS.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="mk-footlink">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="mk-footlink">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* <LiquidWordmark /> */}

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-white/70">
            © {formatManila(new Date(), "yyyy")} BooKanto. {SITE_TAGLINE}.
          </p>
          <ul className="flex gap-6">
            {LEGAL.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="mk-footlink text-[14px]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
