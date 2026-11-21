import { Skeleton } from "@/components/ui/skeleton";

const PANEL = "rounded-xl border border-border bg-card p-5 shadow-2xs sm:p-6";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading pilot metrics">
      <div className="space-y-5">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-[52px] w-full rounded-xl sm:w-[34rem] lg:h-11" />
      </div>

      <div className={PANEL}>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-9 w-28" />
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      <div className={PANEL}>
        <Skeleton className="h-6 w-52" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1.5 h-7 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-[232px] w-full" />
      </div>

      <div className={PANEL}>
        <Skeleton className="h-6 w-40" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
