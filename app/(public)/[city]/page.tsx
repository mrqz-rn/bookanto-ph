import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { searchHref } from "@/features/search/params";
import { getCityListing } from "@/features/search/queries";
import { absoluteUrl, MIN_SHOPS_FOR_LISTING_PAGE, SITE_NAME } from "@/lib/seo";

// Static, rebuilt at least every 10 minutes and when shops change. Must be a literal.
export const revalidate = 600;

// No pages at build time: each is rendered on its first visit, then cached.
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const data = await getCityListing(city);
  if (!data) return {};
  return {
    title: { absolute: `Book local services in ${data.city.name} | ${SITE_NAME}` },
    description: `Find and book barbershops, salons, aircon cleaning and more in ${data.city.name}. Compare prices and reviews, then book online for free.`,
    alternates: { canonical: `/${data.city.slug}` },
    robots: { index: data.shopCount >= MIN_SHOPS_FOR_LISTING_PAGE, follow: true },
  };
}

/** The city hub: its categories (each linking to /[city]/[category]) and top shops. */
export default async function CityPage({ params }: Props) {
  const { city } = await params;
  const data = await getCityListing(city);
  if (!data) notFound();

  return (
    <main id="main" className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Shops in ${data.city.name}`,
          numberOfItems: data.shops.length,
          itemListElement: data.shops.map((shop, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: shop.name,
            url: absoluteUrl(`/shop/${shop.slug}`),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Explore", href: "/explore" },
          { name: data.city.name, href: `/${data.city.slug}` },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Local services in {data.city.name}
        </h1>
        <p className="text-lg text-slate-600">
          {data.shopCount === 0
            ? `No shops in ${data.city.name} yet. Shops are joining every week.`
            : `${data.shopCount === 1 ? "1 shop" : `${data.shopCount} shops`} in ${data.city.name} take bookings on ${SITE_NAME}.`}
        </p>
      </header>

      {data.categories.length > 0 && (
        <section aria-labelledby="city-categories" className="flex flex-col gap-3">
          <h2 id="city-categories" className="font-display text-2xl font-semibold">
            Services in {data.city.name}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${data.city.slug}/${category.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-white px-4 text-sm font-medium hover:bg-accent"
                >
                  {category.name}
                  <span className="text-slate-600">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="city-shops" className="flex flex-col gap-4">
        <h2 id="city-shops" className="font-display text-2xl font-semibold">
          Top shops in {data.city.name}
        </h2>
        {data.shops.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.shops.map((shop) => (
              <li key={shop.id}>
                <ShopCard shop={shop} />
              </li>
            ))}
          </ul>
        ) : (
          <Button asChild className="w-fit">
            <Link href="/explore">Explore other cities</Link>
          </Button>
        )}
        {data.shopCount > data.shops.length && (
          <Button asChild variant="outline" className="w-fit self-center">
            <Link href={searchHref({ city: data.city.slug, page: 2 })}>
              See all {data.shopCount} shops in {data.city.name}
            </Link>
          </Button>
        )}
      </section>
    </main>
  );
}
