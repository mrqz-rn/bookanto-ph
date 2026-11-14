/** Layout for long-form legal pages: privacy policy, terms of service. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <article className="flex flex-col gap-4 leading-relaxed [&_a]:font-semibold [&_a]:text-green-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-semibold [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
        <header className="flex flex-col gap-2 border-b pb-6">
          <h1 className="font-display text-4xl font-bold">{title}</h1>
          <p className="text-sm text-slate-600">Last updated {updated}</p>
        </header>
        {children}
      </article>
    </main>
  );
}
