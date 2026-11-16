import type { Metadata } from "next";

import { getMemberShops } from "@/features/availability/queries";
import { BookingRulesForm } from "@/features/bookings/components/shop/booking-rules-form";
import { NoShop, ShopPageHeader } from "@/features/bookings/components/shop/shop-page";
import { getBookingRules } from "@/features/bookings/customer-queries";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { paymentsEnabled } from "@/lib/payments";

export const metadata: Metadata = { title: "Booking rules" };

export default async function BookingRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const user = await requireUser();
  const shops = await getMemberShops(user.id);
  if (shops.length === 0) return <NoShop />;
  const { shop: wanted } = await searchParams;
  const shop = shops.find((entry) => entry.shopId === wanted) ?? shops[0]!;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ShopPageHeader
        title="Booking rules"
        description="Cancellations, rescheduling, quotes and online payment for"
        shop={shop}
        shops={shops}
        path="/dashboard/booking-rules"
      />
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-6">
        <BookingRulesForm
          shopId={shop.shopId}
          rules={await getBookingRules(shop.shopId)}
          canEdit={can(user, "shop:update", { shopId: shop.shopId })}
          paymentsReady={paymentsEnabled()}
        />
      </div>
    </div>
  );
}
