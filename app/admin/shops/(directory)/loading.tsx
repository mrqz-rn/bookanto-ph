import { Skeleton } from "@/components/ui/skeleton";
import {
  ShopFiltersSkeleton,
  ShopResultsSkeleton,
} from "@/features/admin/components/shops/shop-directory";

export default function AdminShopsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <ShopFiltersSkeleton />
      <ShopResultsSkeleton />
    </div>
  );
}
