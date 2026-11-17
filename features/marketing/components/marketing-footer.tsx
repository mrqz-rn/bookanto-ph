import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SITE_TAGLINE } from "@/lib/seo";
import { formatManila } from "@/lib/time";

import { MAIN_ACTION, PILOT_LAUNCH } from "../content";
import { LiquidWordmark } from "./liquid-wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#inbox", label: "Features" },
      { href: "#modes", label: "Booking types" },
      { href: "#pricing", label: "Pricing" },
      { href: "#mobile", label: "App" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#investors", label: "Investors" },
      { href: "#faq", label: "FAQ" },
      { href: "/explore", label: "Explore shops" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

/** The page's last screen: the close (heading, the main action, the name set wide), then the directory. */
export function MarketingFooter() {
  return (
    <footer aria-labelledby="close-heading" className="mk mk-section mk-closing footer closing">
      <div className="mk-wrap wrap flex flex-col justify-between gap-8 lg:min-h-[calc(100svh-var(--padt)-var(--padb))]">
        <div className="flex flex-col gap-10 lg:gap-12">
          <div className="grid grid-cols-12 items-end gap-x-6 gap-y-8">
            <div className="col-span-12 lg:col-span-7">
              <h2 id="close-heading" className="mk-h2">
                Pilot registration: save your shop&apos;s spot
              </h2>
              <p className="mk-intro max-w-[64ch]">
                Public pilot opens {PILOT_LAUNCH}. The beta with our first partner shops starts
                February 15.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-5 lg:flex lg:justify-end">
              <a
                href="#contact"
                className="mk-btn btn btn--primary mk-btn--primary w-full sm:w-auto"
              >
                {MAIN_ACTION}
                <ArrowRight aria-hidden className="mk-arrow size-5" />
              </a>
            </div>
          </div>
          <LiquidWordmark />
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-12">
            {COLUMNS.map((column) => (
              <nav
                key={column.title}
                aria-label={column.title}
                className="col-span-1 sm:col-span-4"
              >
                <h3 className="text-[14px] font-semibold text-[var(--ink-2)]">{column.title}</h3>
                <ul className="mt-1 flex flex-col">
                  {column.links.map((link) => (
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
            ))}
          </div>
          <p className="text-[14px] text-[var(--ink-2)]">
            © {formatManila(new Date(), "yyyy")} BooKanto. {SITE_TAGLINE}.
          </p>
        </div>
      </div>
    </footer>
  );
}
