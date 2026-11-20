import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/shared/site-footer";
import {
  AccountContentSlot,
  AccountNav,
  AccountNavProvider,
} from "@/features/account/components/account-nav";
import { SiteNav } from "@/features/account/components/site-nav";
import { toViewer } from "@/features/account/viewer";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteNav viewer={toViewer(user)} />

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
