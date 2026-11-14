import { Wordmark } from "@/components/shared/logo";
import { SITE_TAGLINE } from "@/lib/seo";
import { formatManila } from "@/lib/time";

// Legal and help links join this when those pages ship.
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-slate-600">
        <Wordmark className="text-xl" />
        <p>{SITE_TAGLINE}.</p>
        <p>© {formatManila(new Date(), "yyyy")} BooKanto</p>
      </div>
    </footer>
  );
}
