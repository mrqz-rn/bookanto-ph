import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs, type Crumb } from "@/components/shared/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { absoluteUrl, MIN_SHOPS_FOR_BARANGAY_PAGE, MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";

import {
  listingDescription,
  listingFaqs,
  listingHeading,
  listingTitle,
  pluralCategory,
  priceRangeLabel,
} from "../labels";
import { searchHref, type SearchState } from "../params";
import type { ListingPageData, PlaceLink } from "../queries";

function placeName(data: ListingPageData): string | null {
  if (data.barangay && data.city) return `${data.barangay.name}, ${data.city.name}`;
  return data.city?.name ?? null;
}

export function listingPath(data: ListingPageData): string {
  if (data.city && data.barangay)
    return `/${data.city.slug}/${data.barangay.slug}/${data.category.slug}`;
  if (data.city) return `/${data.city.slug}/${data.category.slug}`;
  return `/c/${data.category.slug}`;
}

/**
 * Title, description and canonical URL for a category page. Pages with too
 * few shops stay out of Google (plan: 3 or more, 5 for barangays) but keep
 * their links followable.
 */
export function listingMetadata(data: ListingPageData): Metadata {
  const heading = listingHeading(data.category.name, placeName(data));
  const minShops = data.barangay ? MIN_SHOPS_FOR_BARANGAY_PAGE : MIN_SHOPS_FOR_LISTING_PAGE;
  return {
    // The brand is already in the title, so skip the layout's template.
    title: { absolute: listingTitle(heading, data.minPriceCentavos) },
    description: listingDescription(heading, data.shopCount, data.minPriceCentavos),
    alternates: { canonical: listingPath(data) },
    robots: { index: data.shopCount >= minShops, follow: true },
    openGraph: { title: heading, url: absoluteUrl(listingPath(data)) },
  };
}

/** A category page: /c/[category], /[city]/[category] or /[city]/[barangay]/[category]. */
export function ListingPage({ data, crumbs }: { data: ListingPageData; crumbs: Crumb[] }) {
  const place = placeName(data);
  const heading = listingHeading(data.category.name, place);
  const plural = pluralCategory(data.category.name).toLowerCase();
  const range = priceRangeLabel(data.minPriceCentavos, data.maxPriceCentavos);
  const faqs = listingFaqs({
    category: data.category.name,
    place,
    shopCount: data.shopCount,
    minCentavos: data.minPriceCentavos,
    maxCentavos: data.maxPriceCentavos,
    homeService: data.hasHomeService,
  });
  const context: Partial<SearchState> = {
    category: data.category.slug,
    city: data.city?.slug ?? null,
    barangay: data.barangay?.slug ?? null,
  };
  // Filtering leaves this static page for /search, keeping the same category and place.
  const quickFilters = [
    { label: "Open now", href: searchHref({ ...context, openNow: true }) },
    { label: "Top rated", href: searchHref({ ...context, sort: "rating" }) },
    ...(data.hasHomeService
      ? [{ label: "Home service", href: searchHref({ ...context, bookingType: "home" }) }]
      : []),
    { label: "Verified only", href: searchHref({ ...context, verified: true }) },
    { label: "Map view", href: searchHref({ ...context, view: "map" }) },
  ];

  return (
    <main id="main" className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: heading,
            numberOfItems: data.shops.length,
            itemListElement: data.shops.map((shop, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: shop.name,
              url: absoluteUrl(`/shop/${shop.slug}`),
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{heading}</h1>
        <p className="max-w-prose text-lg text-slate-600">
          {data.shopCount === 0
            ? `No ${plural} are listed${place ? ` in ${place}` : ""} yet.`
            : `Compare ${data.shopCount === 1 ? "1 shop" : `${data.shopCount} shops`}${
                range ? ` with starting prices from ${range}` : ""
              }. See reviews and hours, then book online for free.`}
        </p>
        <nav aria-label="Filter these shops" className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <Link
              key={filter.label}
              href={filter.href}
              className="inline-flex min-h-11 items-center rounded-full border border-input bg-white px-4 text-sm font-medium hover:bg-accent"
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </header>

      {data.shops.length > 0 ? (
        <section aria-labelledby="shops-heading" className="flex flex-col gap-4">
          <h2 id="shops-heading" className="sr-only">
            Shops
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.shops.map((shop) => (
              <li key={shop.id}>
                <ShopCard shop={shop} />
              </li>
            ))}
          </ul>
          {data.shopCount > data.shops.length && (
            <Button asChild variant="outline" className="w-fit self-center">
              <Link href={searchHref({ ...context, page: 2 })}>
                See all {data.shopCount} {plural}
              </Link>
            </Button>
          )}
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-slate-600">
            Shops are joining BooKanto every week. Try a wider area for now.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {data.city && (
              <Button asChild variant="outline">
                <Link href={`/c/${data.category.slug}`}>
                  {pluralCategory(data.category.name)} everywhere
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/explore">Browse categories</Link>
            </Button>
          </div>
        </section>
      )}

      <PlaceLinks
        title={`${pluralCategory(data.category.name)} by barangay`}
        links={data.barangayLinks}
        href={(link) => `/${data.city!.slug}/${link.slug}/${data.category.slug}`}
      />
      <PlaceLinks
        title={`${pluralCategory(data.category.name)} by city`}
        links={data.cityLinks}
        href={(link) => `/${link.slug}/${data.category.slug}`}
      />
      <PlaceLinks
        title={place ? `More services in ${place}` : "More services"}
        links={data.relatedCategories}
        href={(link) => (data.city ? `/${data.city.slug}/${link.slug}` : `/c/${link.slug}`)}
      />

      {faqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="flex flex-col gap-3">
          <h2 id="faq-heading" className="font-display text-2xl font-semibold">
            Questions about {plural}
            {place ? ` in ${place}` : ""}
          </h2>
          <dl className="flex flex-col divide-y rounded-xl border bg-white">
            {faqs.map((faq) => (
              <div key={faq.question} className="flex flex-col gap-1 p-5">
                <dt className="font-semibold">{faq.question}</dt>
                <dd className="text-slate-600">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}

function PlaceLinks({
  title,
  links,
  href,
}: {
  title: string;
  links: PlaceLink[];
  href: (link: PlaceLink) => string;
}) {
  if (links.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.slug}>
            <Link
              href={href(link)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-white px-4 text-sm font-medium hover:bg-accent"
            >
              {link.name}
              <span className="text-slate-600">{link.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
