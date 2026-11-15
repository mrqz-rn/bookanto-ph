import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/shared/json-ld";
import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { getCityListing } from "@/features/search/queries";
import { absoluteUrl, MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const data = await getCityListing(citySlug);

  if (!data) return { title: "City Not Found | BooKanto" };

  const title = `Local Services & Bookings in ${data.city.name} | BooKanto`;
  const description = `Find, compare, and book verified local barbershops, salons, clinics, aircon cleaners, and repair services in ${data.city.name}. Book online instantly.`;

  const isIndexable = data.shopCount >= MIN_SHOPS_FOR_LISTING_PAGE;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/${citySlug}`),
    },
    robots: {
      index: isIndexable,
      follow: true,
    },
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const data = await getCityListing(citySlug);

  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Local Services in ${data.city.name}`,
    numberOfItems: data.shops.length,
    itemListElement: data.shops.map((shop, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: shop.name,
      url: absoluteUrl(`/shop/${shop.slug}`),
    })),
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
          <li className="font-medium text-navy-900" aria-current="page">
            {data.city.name}
          </li>
        </ol>
      </nav>

      {/* Hero Header */}
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Services in {data.city.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {data.shopCount} verified {data.shopCount === 1 ? "provider" : "providers"} serving{" "}
          {data.city.name}.
        </p>
      </div>

      {/* Category Pills in City */}
      {data.categories.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
            Popular Categories in {data.city.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((cat) => (
              <Button asChild key={cat.slug} variant="outline" size="sm" className="h-8 text-xs">
                <Link href={`/${data.city.slug}/${cat.slug}`}>
                  {cat.name} ({cat.count})
                </Link>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Shops Grid */}
      <div>
        <h2 className="mb-4 font-display text-xl font-bold text-navy-900">
          Top Shops in {data.city.name}
        </h2>
        {data.shops.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-slate-600">No active shops registered in {data.city.name} yet.</p>
            <Button asChild className="mt-4">
              <Link href="/explore">Explore Other Cities</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
