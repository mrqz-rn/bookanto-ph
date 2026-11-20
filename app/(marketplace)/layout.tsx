import { SiteFooter } from "@/components/shared/site-footer";
import { SiteNav } from "@/features/account/components/site-nav";
import { toViewer } from "@/features/account/viewer";
import { getCurrentUser } from "@/lib/auth";

// /explore and /search render per request (lib/routes.ts), so the header is
// drawn for the signed-in user on the server, with no flash of "Log in".
export default async function MarketplaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = toViewer(await getCurrentUser());

  return (
    <>
      <SiteNav viewer={viewer} />
      {children}
      <SiteFooter />
    </>
  );
}
