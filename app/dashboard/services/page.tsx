import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ServicesManager } from "@/features/services/components/services-manager";
import {
  getShopCategories,
  getShopMemberships,
  getShopPackages,
  getShopServices,
} from "@/features/services/queries";
import { getUserShops } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Services & Pricing | BooKanto Shop Dashboard",
  description: "Manage your services, pricing, add-ons, packages, and passes.",
};

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard/services");
  }

  const shops = await getUserShops();
  const shop = shops[0] || null;

  if (!shop) {
    redirect("/dashboard/setup");
  }

  const [services, packages, memberships, shopCategories] = await Promise.all([
    getShopServices(shop.id),
    getShopPackages(shop.id),
    getShopMemberships(shop.id),
    getShopCategories(shop.id),
  ]);

  return (
    <div className="py-2">
      <ServicesManager
        shopId={shop.id}
        initialServices={services}
        initialPackages={packages}
        initialMemberships={memberships}
        shopCategories={shopCategories}
      />
    </div>
  );
}
