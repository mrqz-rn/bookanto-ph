import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { homePathFor, isStoreAccount } from "@/lib/home";

/**
 * Every dashboard page except /dashboard/setup. Only store accounts get in;
 * user accounts go back to the marketplace. Setup stays outside this group so
 * a user account can still list a shop (which makes it a store account).
 */
export default async function ShopDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (!isStoreAccount(user)) {
    redirect(homePathFor(user));
  }

  return children;
}
