import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** "★ 4.8 (23)", or a "New" chip before the first review. */
export function Rating({
  average,
  count,
  className,
}: {
  average: number;
  count: number;
  className?: string;
}) {
  if (count === 0) {
    return (
      <span
        className={cn(
          "rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-semibold text-navy-900",
          className,
        )}
      >
        New
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <span className="sr-only">
        Rated {average.toFixed(1)} out of 5 from {count} {count === 1 ? "review" : "reviews"}
      </span>
      <Star aria-hidden className="size-4 fill-yellow-400 text-yellow-400" />
      <span aria-hidden className="font-semibold">
        {average.toFixed(1)}
      </span>
      <span aria-hidden className="text-slate-600">
        ({count})
      </span>
    </span>
  );
}
