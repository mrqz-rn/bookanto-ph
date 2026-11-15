export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 rounded-xl bg-neutral-200" />
          <div className="mt-2 h-4 w-96 rounded-lg bg-neutral-100" />
        </div>
        <div className="h-10 w-80 rounded-2xl bg-neutral-200" />
      </div>

      <div className="h-44 w-full rounded-2xl bg-neutral-200" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-200" />
        ))}
      </div>

      <div className="h-96 w-full rounded-2xl bg-neutral-200" />
    </div>
  );
}
