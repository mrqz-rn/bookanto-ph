import { Skeleton } from "@/components/ui/skeleton";

export default function BookingsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading your bookings" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl sm:w-96" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card shadow-2xs">
            <div className="flex gap-4 p-4 sm:p-5">
              <Skeleton className="h-20 w-16 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48 max-w-full rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-56 max-w-full rounded-md" />
              </div>
            </div>
            <div className="h-14 border-t border-border/70" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your bookings…</span>
    </div>
  );
}
