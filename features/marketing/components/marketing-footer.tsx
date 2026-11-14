import Link from "next/link";

import { Wordmark } from "@/components/shared/logo";
import { SITE_TAGLINE } from "@/lib/seo";
import { formatManila } from "@/lib/time";

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1 text-sm text-slate-600">
          <Wordmark className="text-xl" />
          <p>{SITE_TAGLINE}.</p>
          <p>© {formatManila(new Date(), "yyyy")} BooKanto</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          <Link href="/explore" className="text-navy-900 hover:text-green-700 hover:underline">
            Explore shops
          </Link>
          <a href="#mobile" className="text-navy-900 hover:text-green-700 hover:underline">
            Mobile App
          </a>
          <a href="#pricing" className="text-navy-900 hover:text-green-700 hover:underline">
            Pricing
          </a>
          <a href="#investors" className="text-navy-900 hover:text-green-700 hover:underline">
            For investors
          </a>
          <a href="#contact" className="text-navy-900 hover:text-green-700 hover:underline">
            Contact us
          </a>
          <Link href="/privacy" className="text-navy-900 hover:text-green-700 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-navy-900 hover:text-green-700 hover:underline">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
