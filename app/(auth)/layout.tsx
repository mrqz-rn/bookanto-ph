import Link from "next/link";

import { LogoMark, Wordmark } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-card/60 px-4 py-4 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 rounded-md">
            <LogoMark className="h-8" />
            <Wordmark className="text-2xl" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-navy-900 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
