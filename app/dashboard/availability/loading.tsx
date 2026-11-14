export default function AvailabilityLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div aria-hidden="true">
        <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-5 w-72 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="mt-6 h-12 animate-pulse rounded-full bg-muted" />
        {Array.from({ length: 3 }, (_, section) => (
          <div key={section} className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
            <div className="mt-5 space-y-2">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row} className="h-11 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading your shop&apos;s availability…
      </p>
    </div>
  );
}
