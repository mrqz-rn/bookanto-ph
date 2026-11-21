import { DirectoryHeaderSkeleton } from "@/features/admin/components/directory";
import { ShopResultsSkeleton } from "@/features/admin/components/shops/shop-directory";

export default function AdminShopsLoading() {
  return (
    <div className="space-y-6">
      <DirectoryHeaderSkeleton />
      <ShopResultsSkeleton />
    </div>
  );
}
