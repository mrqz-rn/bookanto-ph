import type { Metadata } from "next";

import { JsonLd } from "@/components/shared/json-ld";
import {
  BookingTypes,
  Contact,
  Faq,
  Features,
  Hero,
  HowItWorks,
  Investors,
  MobilePlatform,
  Pricing,
  Problems,
} from "@/features/marketing/components/sections";
import { FAQS } from "@/features/marketing/content";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

// The business landing page: shops, partners and investors. Customers browse
// shops at /explore. Fully static.

export const metadata: Metadata = {
  title: { absolute: "BooKanto: online booking for local shops in the Philippines" },
  description:
    "Free online booking for barbershops, salons and local service shops in the Philippines. Join the BooKanto pilot, or talk to us about partnering and investing.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <main id="main" className="mx-auto flex max-w-6xl flex-col gap-20 px-4 sm:gap-28">
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
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ question, answer }) => ({
              "@type": "Question",
              name: question,
              acceptedAnswer: { "@type": "Answer", text: answer },
            })),
          },
        ]}
      />
      <Hero />
      <Problems />
      <Features />
      <BookingTypes />
      <HowItWorks />
      <MobilePlatform />
      <Pricing />
      <Investors />
      <Faq />
      <Contact />
    </main>
  );
}
