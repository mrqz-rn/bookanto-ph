import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A plain GET form to /search, so it works before any JavaScript loads. */
export function SearchForm() {
  return (
    <form action="/search" role="search" className="flex gap-2">
      <label htmlFor="search-q" className="sr-only">
        What service do you need?
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-600"
        />
        <Input
          id="search-q"
          name="q"
          type="search"
          placeholder="Haircut, aircon cleaning…"
          enterKeyHint="search"
          maxLength={100}
          className="h-12 pl-10"
        />
      </div>
      <Button type="submit" size="lg">
        Search
      </Button>
    </form>
  );
}
