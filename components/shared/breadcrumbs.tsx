import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { JsonLd } from "@/components/shared/json-ld";
import { absoluteUrl } from "@/lib/seo";

export type Crumb = { name: string; href: string };

/** A breadcrumb trail plus its BreadcrumbList structured data. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.href),
          })),
        }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight aria-hidden className="size-4" />}
                {last ? (
                  <span aria-current="page" className="font-semibold text-navy-900">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-navy-900 hover:underline">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
