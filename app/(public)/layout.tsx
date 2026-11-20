import { SiteFooter } from "@/components/shared/site-footer";
import { SiteNav } from "@/features/account/components/site-nav";

// These pages may be served from the edge cache and must not read cookies,
// so the header learns about the session in the browser.
export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
