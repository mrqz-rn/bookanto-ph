import { ShopRailSkeleton } from "@/components/shared/shop-card";
import { Skeleton } from "@/components/ui/skeleton";

/** Search results load per request; this keeps the page's shape while they do. */
export default function SearchLoading() {
  return (
    <main
      id="main"
      aria-busy="true"
      className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6"
    >
      <span className="sr-only" role="status">
        Searching…
      </span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <ShopRailSkeleton count={8} />
    </main>
  );
}
