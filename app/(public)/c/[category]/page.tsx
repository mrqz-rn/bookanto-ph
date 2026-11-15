import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryIcon } from "@/components/shared/category-icon";
import { JsonLd } from "@/components/shared/json-ld";
import { ShopCard } from "@/components/shared/shop-card";
import { Button } from "@/components/ui/button";
import { getActiveCities, getCategoryListing } from "@/features/search/queries";
import { absoluteUrl, MIN_SHOPS_FOR_LISTING_PAGE } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const data = await getCategoryListing(slug);

  if (!data) return { title: "Category Not Found | BooKanto" };

  const title = `${data.name} Near You | Book Local Services | BooKanto`;
  const description = `Find and book the best ${data.name.toLowerCase()} services in your neighborhood. Compare prices, check real customer reviews, and book online.`;

  const isIndexable = data.shopCount >= MIN_SHOPS_FOR_LISTING_PAGE;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/c/${slug}`),
    },
    robots: {
      index: isIndexable,
      follow: true,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const [data, cities] = await Promise.all([getCategoryListing(slug), getActiveCities()]);

  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${data.name} Services in the Philippines`,
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
          <li>
            <Link href="/explore" className="hover:text-slate-800">
              Categories
            </Link>
          </li>
          <ChevronRight className="size-3 text-slate-400" />
          <li className="font-medium text-navy-900" aria-current="page">
            {data.name}
          </li>
        </ol>
      </nav>

      {/* Hero Header */}
      <div className="mb-8 flex items-center gap-4 border-b border-border pb-6">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent text-green-700">
          <CategoryIcon name={data.icon} className="size-8" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">{data.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data.shopCount} verified {data.shopCount === 1 ? "provider" : "providers"} available
            nationwide.
          </p>
        </div>
      </div>

      {/* Quick City Filters */}
      {cities.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
            Browse by City
          </h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <Button asChild key={city.slug} variant="outline" size="sm" className="h-8 text-xs">
                <Link href={`/${city.slug}/${data.slug}`}>{city.name}</Link>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Shops Grid */}
      {data.shops.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-slate-600">No active {data.name.toLowerCase()} shops yet.</p>
          <Button asChild className="mt-4">
            <Link href="/explore">Explore Other Categories</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
