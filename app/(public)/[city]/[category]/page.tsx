import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/shared/json-ld";
import { PriceTag } from "@/components/shared/price-tag";
import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { getCityCategoryListing } from "@/features/search/queries";
import { absoluteUrl, MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  const data = await getCityCategoryListing(citySlug, categorySlug);

  if (!data) return { title: "Location Not Found | BooKanto" };

  const priceText =
    data.fromPriceCentavos !== null ? `, from ₱${Math.round(data.fromPriceCentavos / 100)}` : "";
  const title = `${data.category.name} in ${data.city.name}${priceText} | BooKanto`;
  const description = `Find top-rated ${data.category.name.toLowerCase()} in ${data.city.name}. Compare local shops, check prices, read real verified reviews, and book online instantly.`;

  const isIndexable = data.shopCount >= MIN_SHOPS_FOR_LISTING_PAGE;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/${citySlug}/${categorySlug}`),
    },
    robots: {
      index: isIndexable,
      follow: true,
    },
  };
}

export default async function CityCategoryPage({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}) {
  const { city: citySlug, category: categorySlug } = await params;
  const data = await getCityCategoryListing(citySlug, categorySlug);

  if (!data) notFound();

  const faqs = [
    {
      q: `How do I book a ${data.category.name.toLowerCase()} in ${data.city.name}?`,
      a: `Simply choose a verified shop from the list above, select your desired service and staff, pick an available slot, and confirm your appointment with instant booking.`,
    },
    {
      q: `How much do ${data.category.name.toLowerCase()} services cost in ${data.city.name}?`,
      a:
        data.fromPriceCentavos !== null
          ? `Prices in ${data.city.name} start at ₱${Math.round(data.fromPriceCentavos / 100)} depending on the specific service and add-ons.`
          : `Prices vary by service provider. View individual shop listings to see full upfront pricing and packages.`,
    },
    {
      q: `Can I cancel or reschedule my appointment?`,
      a: `Yes! You can easily reschedule or cancel your booking through your BooKanto account subject to each shop's cancellation window.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          {
            "@type": "ListItem",
            position: 2,
            name: data.city.name,
            item: absoluteUrl(`/${data.city.slug}`),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `${data.category.name} in ${data.city.name}`,
            item: absoluteUrl(`/${data.city.slug}/${data.category.slug}`),
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${data.category.name} in ${data.city.name}`,
        numberOfItems: data.shops.length,
        itemListElement: data.shops.map((shop, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: shop.name,
          url: absoluteUrl(`/shop/${shop.slug}`),
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <JsonLd data={jsonLd} />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-slate-500">
          <li>
            <Link href="/" className="hover:text-slate-800">
              Home
            </Link>
          </li>
          <ChevronRight className="size-3 text-slate-400" />
          <li>
            <Link href={`/${data.city.slug}`} className="hover:text-slate-800">
              {data.city.name}
            </Link>
          </li>
          <ChevronRight className="size-3 text-slate-400" />
          <li className="font-medium text-navy-900" aria-current="page">
            {data.category.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {data.category.name} in {data.city.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {data.shopCount} verified {data.shopCount === 1 ? "shop" : "shops"}
            {data.fromPriceCentavos !== null && (
              <>
                {" · "}
                Prices start at{" "}
                <PriceTag
                  centavos={data.fromPriceCentavos}
                  type="starts_at"
                  className="inline font-semibold"
                />
              </>
            )}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9 self-start sm:self-auto">
          <Link href={`/c/${data.category.slug}`}>View Nationwide</Link>
        </Button>
      </div>

      {/* Shops Grid */}
      {data.shops.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-slate-600">
            No active {data.category.name.toLowerCase()} providers found in {data.city.name} yet.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/${data.city.slug}`}>Browse All in {data.city.name}</Link>
            </Button>
            <Button asChild>
              <Link href={`/c/${data.category.slug}`}>Browse Nationwide</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Frequently Asked Questions */}
      <section className="mt-12 rounded-xl border border-border bg-card p-6 shadow-2xs">
        <h2 className="font-display text-xl font-bold text-navy-900">Frequently Asked Questions</h2>
        <dl className="mt-4 divide-y divide-border">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-4 first:pt-0 last:pb-0">
              <dt className="font-semibold text-navy-900">{faq.q}</dt>
              <dd className="mt-1 text-sm text-slate-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
