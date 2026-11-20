"use client";

import * as React from "react";
import { cn } from "cn";

/**
 * The sticky jump links over the availability sections. The link for the
 * section in view is marked, so the owner knows where they are on a long page.
 */
export function SectionNav({
  sections,
}: {
  sections: ReadonlyArray<{ id: string; label: string }>;
}) {
  const [active, setActive] = React.useState(sections[0]?.id ?? "");

  React.useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => !!element);
    if (elements.length === 0 || !("IntersectionObserver" in window)) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        // The topmost section still on screen below the sticky bar.
        const first = sections.find((section) => visible.has(section.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-200px 0px -40% 0px" },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Availability sections"
      className="sticky top-28 z-30 -mx-4 overflow-x-auto border-y border-border bg-neutral-50/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:bg-white/95 sm:px-1.5 sm:py-1.5"
    >
      <ul className="flex gap-1">
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={current ? "location" : undefined}
                onClick={() => setActive(section.id)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  current
                    ? "bg-navy-900 text-white"
                    : "text-slate-600 hover:bg-muted hover:text-navy-900",
                )}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
