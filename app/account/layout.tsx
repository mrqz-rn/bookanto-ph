import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { SiteFooter } from "@/components/shared/site-footer";
import {
  AccountContentSlot,
  AccountNav,
  AccountNavProvider,
} from "@/features/account/components/account-nav";
import { getCurrentUser } from "@/lib/auth";
import { isStoreAccount } from "@/lib/home";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 rounded-md">
            <LogoMark className="h-10" />
            <Wordmark className="text-2xl" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={isStoreAccount(user) ? "/dashboard" : "/explore"}
              className="text-sm font-medium text-slate-600 hover:text-navy-900"
            >
              {isStoreAccount(user) ? "Dashboard" : "Marketplace"}
            </Link>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-green-700">
              Account
            </span>
          </div>
        </div>
      </header>

      {/* Main Account Area */}
      <AccountNavProvider>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
            <aside>
              <AccountNav userName={user.name} userPhone={user.phone} userEmail={user.email} />
            </aside>
            <main id="main" className="min-w-0">
              <AccountContentSlot>{children}</AccountContentSlot>
            </main>
          </div>
        </div>
      </AccountNavProvider>

      <SiteFooter />
    </div>
  );
}
