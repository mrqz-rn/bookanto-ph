import { NextResponse, type NextRequest } from "next/server";

import { getTodayDashboardData } from "@/features/bookings/queries";
import { getUserShops } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shops = await getUserShops();
  if (shops.length === 0) {
    return NextResponse.json({ error: "No shop associated with user" }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedShopId = searchParams.get("shopId");

  const targetShop = requestedShopId ? shops.find((s) => s.id === requestedShopId) : shops[0];

  if (!targetShop) {
    return NextResponse.json({ error: "Shop not found or access denied" }, { status: 403 });
  }

  const data = await getTodayDashboardData(targetShop.id);
  return NextResponse.json({
    ok: true,
    shopId: targetShop.id,
    data,
  });
}
