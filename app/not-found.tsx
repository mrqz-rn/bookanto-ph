import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-16">
      <h1 className="font-display text-3xl">Page not found</h1>
      <p className="text-slate-600">This page may have moved, or the link may be wrong.</p>
      <Button asChild className="w-fit">
        <Link href="/">Go to the home page</Link>
      </Button>
    </main>
  );
}
