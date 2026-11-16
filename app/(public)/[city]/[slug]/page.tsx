import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingPage, listingMetadata } from "@/features/search/components/listing-page";
import { listingHeading } from "@/features/search/labels";
import { getListingPage } from "@/features/search/queries";

// Static, rebuilt at least every 10 minutes and when shops change. Must be a literal.
export const revalidate = 600;

// No pages at build time: each is rendered on its first visit, then cached.
export function generateStaticParams() {
  return [];
}

// The second segment is named [slug] because /[city]/[slug]/[category] (a
// barangay page) shares it: Next.js needs one name per segment.
type Props = { params: Promise<{ city: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, slug: category } = await params;
  const data = await getListingPage({ city, category });
  return data ? listingMetadata(data) : {};
}

export default async function CityCategoryPage({ params }: Props) {
  const { city, slug: category } = await params;
  const data = await getListingPage({ city, category });
  if (!data?.city) notFound();

  return (
    <ListingPage
      data={data}
      crumbs={[
        { name: "Explore", href: "/explore" },
        { name: data.city.name, href: `/${data.city.slug}` },
        {
          name: listingHeading(data.category.name, data.city.name),
          href: `/${data.city.slug}/${data.category.slug}`,
        },
      ]}
    />
  );
}
