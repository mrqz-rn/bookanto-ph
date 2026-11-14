import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CategoryIcon } from "@/components/shared/category-icon";

import type { HomeCategory } from "../queries";

export function CategoryTiles({ categories }: { categories: HomeCategory[] }) {
  return (
    <ul className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-8">
      {categories.map((category) => (
        <li key={category.slug}>
          <Tile
            href={`/c/${category.slug}`}
            label={category.name}
            icon={<CategoryIcon name={category.icon} className="size-6 text-green-700" />}
          />
        </li>
      ))}
      <li>
        <Tile
          href="/search"
          label="All services"
          icon={<LayoutGrid aria-hidden className="size-6 text-navy-900" />}
        />
      </li>
    </ul>
  );
}

function Tile({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col items-center gap-2 rounded-lg p-1 text-center text-sm leading-tight font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-14 items-center justify-center rounded-full border bg-white shadow-xs">
        {icon}
      </span>
      <span className="line-clamp-2">{label}</span>
    </Link>
  );
}
