import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingHeader } from "@/features/marketing/components/marketing-header";

import "@/features/marketing/marketing.css";

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="mk">
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}
