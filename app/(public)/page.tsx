import type { Metadata } from "next";

import { JsonLd } from "@/components/shared/json-ld";
import { LogoMark, Wordmark } from "@/components/shared/logo";
import { absoluteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            logo: absoluteUrl("/icons/icon-512.png"),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: absoluteUrl("/"),
          },
        ]}
      />
      <div className="flex items-center gap-3">
        <LogoMark className="h-14" />
        <Wordmark className="text-5xl" />
      </div>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">{SITE_TAGLINE}</h1>
      <p className="text-lg text-slate-600">
        Barbershops, salons, aircon cleaning, auto repair and more, from shops near you. Pick a
        time, book na, and get a text when the shop confirms.
      </p>
      <p className="w-fit rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-navy-900">
        Launching soon
      </p>
    </main>
  );
}
