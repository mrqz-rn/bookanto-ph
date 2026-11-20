import { ShopRailSkeleton } from "@/components/shared/shop-card";
import { Skeleton } from "@/components/ui/skeleton";

/** Keeps the explore page's shape while its shop lists load. */
export default function ExploreLoading() {
  return (
    <main id="main" aria-busy="true" className="flex flex-col gap-12 pb-4">
      <span className="sr-only" role="status">
        Loading shops…
      </span>
      <div className="border-b bg-accent/60">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-40 bg-white/70" />
            <Skeleton className="h-11 w-full max-w-lg bg-white/70" />
            <Skeleton className="h-6 w-full max-w-prose bg-white/70" />
            <Skeleton className="h-16 w-full rounded-xl bg-white" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl bg-white" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-40" />
          <ShopRailSkeleton />
        </div>
      </div>
    </main>
  );
}
