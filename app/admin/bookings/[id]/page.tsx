import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminBookingDetailView } from "@/features/admin/components/bookings/booking-detail";
import { getAdminBookingById, getAdminBookingMessages } from "@/features/admin/queries";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { assertCan, can } from "@/lib/authz";
import { getClientIp } from "@/lib/request";

export const metadata: Metadata = {
  title: "Booking | BooKanto Admin",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AdminBookingPageProps = { params: Promise<{ id: string }> };

export default async function AdminBookingPage({ params }: AdminBookingPageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requireUser();
  const booking = await getAdminBookingById(id);
  if (!booking) notFound();

  const resource = { shopId: booking.shopId, customerId: booking.customerId };
  assertCan(user, "booking:read", resource);

  // RBAC: admins read a booking's chat only while it has an open dispute.
  const mayReadChat = can(user, "message:read", { ...resource, disputed: booking.hasOpenDispute });
  const messages = mayReadChat ? await getAdminBookingMessages(id) : null;

  // Plan: every admin view of a booking is logged.
  await writeAudit({
    actorId: user.id,
    action: "booking.viewed_by_admin",
    targetType: "booking",
    targetId: id,
    data: { chatRead: mayReadChat },
    ip: await getClientIp(),
  });

  return <AdminBookingDetailView booking={booking} messages={messages} />;
}
