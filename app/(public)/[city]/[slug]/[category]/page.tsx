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

// [slug] is the barangay here; see ../page.tsx for why it isn't called [barangay].
type Props = { params: Promise<{ city: string; slug: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, slug: barangay, category } = await params;
  const data = await getListingPage({ city, barangay, category });
  return data ? listingMetadata(data) : {};
}

/** Published (indexed) once 5 or more shops are listed; see listingMetadata. */
export default async function BarangayCategoryPage({ params }: Props) {
  const { city, slug: barangay, category } = await params;
  const data = await getListingPage({ city, barangay, category });
  if (!data?.city || !data.barangay) notFound();

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
        {
          name: data.barangay.name,
          href: `/${data.city.slug}/${data.barangay.slug}/${data.category.slug}`,
        },
      ]}
    />
  );
}
