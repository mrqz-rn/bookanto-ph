import { NextResponse, type NextRequest } from "next/server";

import { getAdminBookingById } from "@/features/admin/queries";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || (user.platformRole !== "admin" && user.platformRole !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const booking = await getAdminBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Audit requirement: every admin view of a booking writes audit_log
  await writeAudit({
    actorId: user.id,
    action: "booking.viewed_by_admin",
    targetType: "booking",
    targetId: id,
  });

  return NextResponse.json(booking);
}
