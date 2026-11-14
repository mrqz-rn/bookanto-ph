import Link from "next/link";

import type { ListingLink } from "../queries";

/** Links to city-and-category pages, which carry most of the search traffic. */
export function ListingLinks({ links }: { links: ListingLink[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={`${link.citySlug}/${link.categorySlug}`}>
          <Link
            href={`/${link.citySlug}/${link.categorySlug}`}
            className="inline-flex h-11 items-center rounded-full border border-input bg-white px-4 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {link.categoryName} in {link.cityName}
          </Link>
        </li>
      ))}
    </ul>
  );
}
