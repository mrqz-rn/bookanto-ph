import { BookingResultsSkeleton } from "@/features/admin/components/bookings/booking-directory";
import { DirectoryHeaderSkeleton } from "@/features/admin/components/directory";

export default function AdminBookingsLoading() {
  return (
    <div className="space-y-6">
      <DirectoryHeaderSkeleton />
      <BookingResultsSkeleton />
    </div>
  );
}
