"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
      <p className="text-slate-600">
        Please try again. If it keeps happening, wait a few minutes and reload the page.
      </p>
      <Button onClick={reset} className="w-fit">
        Try again
      </Button>
    </main>
  );
}
