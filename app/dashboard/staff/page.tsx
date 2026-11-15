import { redirect } from "next/navigation";

import { StaffManager } from "@/features/shops/components/staff-manager";
import { getShopTeamMembers, getUserShops } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/authz";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard/staff");
  }

  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard");
  }

  const members = await getShopTeamMembers(shop.id);
  const canManage = can(user, "shop_member:manage", { shopId: shop.id, memberRole: "staff" });

  return <StaffManager shopId={shop.id} members={members} canManage={canManage} />;
}
