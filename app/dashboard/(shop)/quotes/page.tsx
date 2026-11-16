import type { Metadata } from "next";

import { getMemberShops } from "@/features/availability/queries";
import { QuoteRequests } from "@/features/bookings/components/shop/quote-requests";
import { NoShop, ShopPageHeader } from "@/features/bookings/components/shop/shop-page";
import { getQuoteRequests } from "@/features/bookings/customer-queries";
import { requireUser } from "@/lib/auth";
import { formatManila } from "@/lib/time";

export const metadata: Metadata = { title: "Quote requests" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const user = await requireUser();
  const shops = await getMemberShops(user.id);
  if (shops.length === 0) return <NoShop />;
  const { shop: wanted } = await searchParams;
  const shop = shops.find((entry) => entry.shopId === wanted) ?? shops[0]!;

  const requests = await getQuoteRequests(shop.shopId);
  const formatWhen = Object.fromEntries(
    requests.map((request) => [
      request.id,
      {
        start: formatManila(request.startAt),
        expires: request.expiresAt ? formatManila(request.expiresAt) : null,
      },
    ]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ShopPageHeader
        title="Quote requests"
        description="Name a price; the customer accepts to confirm. For"
        shop={shop}
        shops={shops}
        path="/dashboard/quotes"
      />
      <QuoteRequests requests={requests} formatWhen={formatWhen} />
    </div>
  );
}
