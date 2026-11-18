import type { Metadata } from "next";

import { JsonLd } from "@/components/shared/json-ld";
import { LandingPage as LandingSections } from "@/features/marketing/components/sections";
import { LANDING_FAQS } from "@/features/marketing/content";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "BooKanto: online booking for local service shops in the Philippines" },
  description:
    "Online booking for barbershops, salons, and local service shops across the Philippines. Take 24/7 bookings, walk-ins, and email reminders for ₱0 during the 8-month pilot.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "BooKanto: online booking for local service shops in the Philippines",
    description:
      "Online booking for barbershops, salons, and local service shops across the Philippines. Free for 8 months during the pilot.",
  },
  other: {
    "site-kind": "software",
    "page-type": "software",
  },
};

// The business landing page: shops, partners and investors. Customers browse
// shops at /explore. Fully static.

export default function LandingPage() {
  return (
    <>
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
            mainEntity: LANDING_FAQS.map(({ question, answer }) => ({
              "@type": "Question",
              name: question,
              acceptedAnswer: { "@type": "Answer", text: answer },
            })),
          },
        ]}
      />
      <LandingSections />
    </>
  );
}
