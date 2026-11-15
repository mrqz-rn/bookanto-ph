import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopDetailView } from "@/features/admin/components/shops/shop-detail-view";
import { getAdminShopById } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Shop Verification Review | BooKanto Admin",
};

type ShopDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { id } = await params;
  const shop = await getAdminShopById(id);

  if (!shop) {
    notFound();
  }

  return <ShopDetailView shop={shop} />;
}
