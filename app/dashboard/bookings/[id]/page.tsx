import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatThread } from "@/features/messages/components/chat-thread";
import { getBookingChatContext } from "@/features/messages/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatManila } from "@/lib/time";

export const metadata: Metadata = {
  title: "Shop Booking Chat & Details | BooKanto",
  description: "Chat with customer, send photos, and use quick replies for this booking.",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShopBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/dashboard/bookings/${id}`);
  }

  const chatContext = await getBookingChatContext(id);

  if (!chatContext) {
    notFound();
  }

  const startFormatted = formatManila(new Date(chatContext.startAt), "EEEE, MMMM d, yyyy · h:mm a");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
        >
          <Link href="/dashboard/inbox">
            <ArrowLeft className="size-4" />
            <span>Back to Inbox</span>
          </Link>
        </Button>
        <span className="font-mono text-xs font-bold text-neutral-500">
          Ref: {chatContext.refCode}
        </span>
      </div>

      {/* Main Grid: Booking Details on left, Chat on right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Customer and Booking summary */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Customer & Service
                </span>
                <h1 className="mt-1 text-lg font-bold text-neutral-900">
                  {chatContext.customerName}
                </h1>
                <p className="text-xs font-semibold text-emerald-700">{chatContext.serviceName}</p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  chatContext.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800"
                    : chatContext.status === "completed"
                      ? "bg-blue-100 text-blue-800"
                      : chatContext.status === "requested"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {chatContext.status}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="font-semibold text-neutral-800">Appointment Time</p>
                  <p>{startFormatted}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Store className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="font-semibold text-neutral-800">Shop</p>
                  <p>{chatContext.shopName}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                <p className="font-bold">⚡ Quick Replies Available</p>
                <p className="mt-0.5 text-emerald-800">
                  Tap the lightning icon in the chat input to quickly reply with arrival updates,
                  requests, or confirmations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chat Thread */}
        <div className="lg:col-span-7">
          <ChatThread
            bookingId={chatContext.bookingId}
            shopId={chatContext.shopId}
            initialMessages={chatContext.messages}
            quickReplies={chatContext.quickReplies}
            isShopMember={true}
            canManageQuickReplies={chatContext.canManageQuickReplies}
            headerTitle={`Chat with ${chatContext.customerName}`}
            headerSubtitle={`Ref: ${chatContext.refCode} · ${chatContext.serviceName}`}
          />
        </div>
      </div>
    </div>
  );
}
