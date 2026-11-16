import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingPage, listingMetadata } from "@/features/search/components/listing-page";
import { pluralCategory } from "@/features/search/labels";
import { getListingPage } from "@/features/search/queries";

// Static, rebuilt at least every 10 minutes and when shops change. Must be a literal.
export const revalidate = 600;

// No pages at build time: each is rendered on its first visit, then cached.
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const data = await getListingPage({ category });
  return data ? listingMetadata(data) : {};
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const data = await getListingPage({ category });
  if (!data) notFound();

  return (
    <ListingPage
      data={data}
      crumbs={[
        { name: "Explore", href: "/explore" },
        { name: pluralCategory(data.category.name), href: `/c/${data.category.slug}` },
      ]}
    />
  );
}
