import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink, MapPin, Store, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomerBookingActions } from "@/features/bookings/components/customer/customer-booking-actions";
import { getMyBooking } from "@/features/bookings/customer-queries";
import { ChatThread } from "@/features/messages/components/chat-thread";
import { getBookingChatContext } from "@/features/messages/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatPeso } from "@/lib/money";
import { formatManila } from "@/lib/time";

export const metadata: Metadata = {
  title: "Booking Details & Chat | BooKanto",
  description: "View appointment details and chat directly with your service provider.",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/account/bookings/${id}`);
  }

  const [booking, chatContext] = await Promise.all([
    getMyBooking(user.id, id),
    getBookingChatContext(id),
  ]);

  if (!booking || !chatContext) {
    notFound();
  }

  const startFormatted = formatManila(new Date(booking.startAt), "EEEE, MMMM d, yyyy · h:mm a");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
        >
          <Link href="/account/bookings">
            <ArrowLeft className="size-4" />
            <span>Back to My Bookings</span>
          </Link>
        </Button>
        <span className="font-mono text-xs font-bold text-neutral-500">Ref: {booking.refCode}</span>
      </div>

      {/* Main Grid: Booking Details on left, Chat on right on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Appointment summary card */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Appointment Details
                </span>
                <h1 className="mt-1 text-lg font-bold text-neutral-900">{booking.serviceName}</h1>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Store className="size-3.5" />
                  <Link
                    href={`/shop/${booking.shopSlug}`}
                    className="flex items-center gap-1 hover:underline"
                  >
                    {booking.shopName}
                    <ExternalLink className="size-2.5" />
                  </Link>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  booking.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800"
                    : booking.status === "completed"
                      ? "bg-blue-100 text-blue-800"
                      : booking.status === "requested"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {booking.status}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="font-semibold text-neutral-800">Schedule</p>
                  <p>{startFormatted}</p>
                </div>
              </div>

              {booking.shopAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                  <div>
                    <p className="font-semibold text-neutral-800">Location</p>
                    <p>{booking.address || booking.shopAddress}</p>
                  </div>
                </div>
              )}

              {booking.staffName && (
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                  <div>
                    <p className="font-semibold text-neutral-800">Assigned Staff</p>
                    <p>{booking.staffName}</p>
                  </div>
                </div>
              )}

              {booking.totalCentavos !== null && (
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs">
                  <span className="font-semibold text-neutral-800">Total Price</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {formatPeso(booking.totalCentavos)}
                  </span>
                </div>
              )}

              {booking.notes && (
                <div className="mt-2 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-800">Booking Notes:</span>{" "}
                  {booking.notes}
                </div>
              )}
            </div>
          </div>

          <CustomerBookingActions booking={booking} />
        </div>

        {/* Right Column: Chat Thread */}
        <div className="lg:col-span-7">
          <ChatThread
            bookingId={chatContext.bookingId}
            shopId={chatContext.shopId}
            initialMessages={chatContext.messages}
            quickReplies={chatContext.quickReplies}
            isShopMember={false}
            canManageQuickReplies={false}
            headerTitle={`Chat with ${chatContext.shopName}`}
            headerSubtitle={`Ref: ${chatContext.refCode} · ${booking.serviceName}`}
          />
        </div>
      </div>
    </div>
  );
}
