import type { Metadata } from "next";

import { getMemberShops } from "@/features/availability/queries";
import { QueueBoard } from "@/features/bookings/components/shop/queue-board";
import { NoShop, ShopPageHeader } from "@/features/bookings/components/shop/shop-page";
import { getTodaysQueue } from "@/features/bookings/customer-queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Today's queue" };

export default async function QueuePage({
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
        title="Today's queue"
        description="Numbers for queue services, in order, at"
        shop={shop}
        shops={shops}
        path="/dashboard/queue"
      />
      <QueueBoard entries={await getTodaysQueue(shop.shopId, new Date())} />
    </div>
  );
}
