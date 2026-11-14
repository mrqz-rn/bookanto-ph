import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/features/shops/components/onboarding-wizard";
import {
  getActiveCategories,
  getCitiesAndBarangays,
  getShopForOnboarding,
  getUserShops,
} from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shop Onboarding | BooKanto",
  description: "Set up your shop details, location map pin, hours, photos, and verification.",
};

export default async function ShopSetupPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard/setup");
  }

  const userShops = await getUserShops();
  const currentShop = userShops[0] || null;

  const onboardingData = currentShop ? await getShopForOnboarding(currentShop.id) : null;
  const categories = await getActiveCategories();
  const cities = await getCitiesAndBarangays();

  return (
    <div className="py-2">
      <OnboardingWizard
        initialData={onboardingData}
        availableCategories={categories}
        availableCities={cities}
      />
    </div>
  );
}
