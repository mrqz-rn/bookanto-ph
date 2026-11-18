import { ChevronDown, Mail } from "lucide-react";
import Link from "next/link";

import { LogoMark, Wordmark } from "@/components/shared/logo";

import { FEATURE_LINKS, MAIN_ACTION, NAV } from "../content";
import { MobileMenu } from "./mobile-menu";

const NAV_FEATURES = { href: "#inbox", label: "Features" };

/** The fixed, opaque header: logo on the left line, the main action on the right one. */
export function MarketingHeader() {
  const [features = NAV_FEATURES, ...words] = NAV;

  return (
    <header className="mk mk-nav nav">
      <div className="mk-wrap wrap flex h-full items-center justify-between gap-4">
        <a href="#main" className="mk-skip">
          Skip to content
        </a>
        <Link
          href="/"
          className="nav__logo flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap"
        >
          <LogoMark className="h-9" />
          <Wordmark className="text-[22px] sm:text-2xl" />
        </Link>

        <nav aria-label="Page sections" className="hidden h-full lg:block">
          <ul className="flex h-full items-center">
            <li className="mk-mega flex h-full items-center">
              <a href={features.href} className="mk-navword">
                {features.label}
                <ChevronDown aria-hidden className="mk-mega__chevron size-4" />
              </a>
              <div className="mk-mega__panel">
                <div className="mk-wrap wrap grid grid-cols-12 gap-6 py-6">
                  <ul className="col-span-8 grid grid-cols-3 gap-2">
                    {FEATURE_LINKS.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} className="mk-mega__link">
                          <span className="font-display text-lg font-bold">{link.title}</span>
                          <span className="mk-body">{link.body}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="mk-frame frame col-span-4 flex items-center p-6">
                    <div aria-hidden className="mk-ui mk-ui-surface flex w-full gap-3 p-4">
                      <Mail className="mt-0.5 size-5 shrink-0 text-green-700" />
                      <p>
                        <span className="block font-semibold">Email to Maria Santos</span>
                        <span className="text-[var(--ink-2)]">
                          Your Gupit + Balbas at Kuya Jun&apos;s is confirmed for today, 2:30 PM.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            {words.map((word) => (
              <li key={word.href}>
                <a href={word.href} className="mk-navword">
                  {word.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions flex items-center gap-2">
          <Link href="/login" className="mk-navword hidden sm:inline-flex">
            Log in
          </Link>
          <a
            href="#contact"
            className="mk-btn btn btn--primary mk-btn--primary hidden sm:inline-flex"
          >
            {MAIN_ACTION}
          </a>
          <MobileMenu links={NAV} action={MAIN_ACTION} />
        </div>
      </div>
    </header>
  );
}
