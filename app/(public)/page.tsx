import { CalendarCheck, MessageSquareText, Search } from "lucide-react";
import type { Metadata } from "next";

import { JsonLd } from "@/components/shared/json-ld";
import { ShopRail, type ShopCardData } from "@/components/shared/shop-card";
import { CategoryTiles } from "@/features/search/components/category-tiles";
import { ListingLinks } from "@/features/search/components/listing-links";
import { NearbyShops } from "@/features/search/components/nearby-shops";
import { SearchForm } from "@/features/search/components/search-form";
import {
  getActiveCities,
  getHomeCategories,
  getNewShops,
  getPopularListingLinks,
  getTopRatedShops,
} from "@/features/search/queries";
import { ListYourShop } from "@/features/shops/components/list-your-shop";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

// Static, rebuilt at least every 10 minutes, and at once when shop data
// changes (the cache tags in lib/cache.ts). Must be a literal.
export const revalidate = 600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, topRated, newShops, listingLinks, cities] = await Promise.all([
    getHomeCategories(),
    getTopRatedShops(),
    getNewShops(),
    getPopularListingLinks(),
    getActiveCities(),
  ]);
  const hasShops = newShops.length > 0;

  return (
    <main id="main" className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pt-8 sm:pt-12">
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
        ]}
      />

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Book services <span className="text-orange-700">sa kanto mo</span>
          </h1>
          <p className="max-w-prose text-lg text-slate-600">
            Barbershops, salons, aircon cleaning and more from trusted shops near you. Pick a time,
            book na, and get a text when the shop confirms.
          </p>
        </div>
        <SearchForm />
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
          <h2 id="categories-heading" className="text-xl font-bold">
            What do you need today?
          </h2>
          <CategoryTiles categories={categories} />
        </section>
      )}

      {hasShops ? (
        <>
          <NearbyShops cities={cities} />
          {topRated.length > 0 && <ShopSection id="top-rated" title="Top rated" shops={topRated} />}
          <ShopSection id="new-shops" title="New shops" shops={newShops} />
        </>
      ) : (
        <NoShopsYet />
      )}

      {listingLinks.length > 0 && (
        <section aria-labelledby="popular-searches-heading" className="flex flex-col gap-4">
          <h2 id="popular-searches-heading" className="text-xl font-bold">
            Popular searches
          </h2>
          <ListingLinks links={listingLinks} />
        </section>
      )}

      <HowItWorks />
      <ListYourShop />
    </main>
  );
}

function ShopSection({ id, title, shops }: { id: string; title: string; shops: ShopCardData[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      <ShopRail shops={shops} />
    </section>
  );
}

/** Before the first shop is approved. */
function NoShopsYet() {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="text-xl font-bold">Shops are joining now</h2>
      <p className="mt-2 max-w-prose text-slate-600">
        We&apos;re signing up barbershops, salons and other shops near you. Check back soon. If you
        own a shop, you can be one of the first.
      </p>
    </section>
  );
}

const STEPS = [
  {
    icon: Search,
    title: "Find a shop",
    body: "Compare prices, reviews and distance for shops near you.",
  },
  {
    icon: CalendarCheck,
    title: "Pick a time",
    body: "Choose an open slot or book a home visit. Book na, no calls needed.",
  },
  {
    icon: MessageSquareText,
    title: "Get a text",
    body: "We text you when the shop confirms, and you can chat with the shop in the app.",
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="flex flex-col gap-4">
      <h2 id="how-heading" className="text-xl font-bold">
        How BooKanto works
      </h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-lg border bg-white p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
              <step.icon aria-hidden className="size-5 text-orange-700" />
            </span>
            <div>
              <h3 className="font-semibold">
                {index + 1}. {step.title}
              </h3>
              <p className="text-sm text-slate-600">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
