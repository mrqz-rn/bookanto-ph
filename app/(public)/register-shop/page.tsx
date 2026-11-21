import type { Metadata } from "next";

import { RegisterShopLanding } from "@/features/shops/components/register-shop-landing";
import { SHOP_REGISTRATION_ROUTE } from "@/lib/home";

export const metadata: Metadata = {
  title: "Register your shop",
  description:
    "List your shop or home service on BooKanto and get bookings from customers nearby. Free during the pilot.",
  alternates: { canonical: SHOP_REGISTRATION_ROUTE },
};

export default function RegisterShopPage() {
  return <RegisterShopLanding />;
}
