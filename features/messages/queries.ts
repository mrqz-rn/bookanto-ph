import "server-only";

import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  bookings,
  messages,
  quickReplies,
  services,
  shopMembers,
  shops,
  users,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { mediaUrl } from "@/lib/media";

import {
  DEFAULT_QUICK_REPLIES,
  type ChatMessage,
  type QuickReplyItem,
  type SenderRole,
} from "./constants";

/**
 * Returns all messages on a booking for authorized users (the customer, assigned staff, or shop owner/manager).
 */
export async function getBookingMessages(bookingId: string): Promise<ChatMessage[]> {
  const user = await requireUser();

  const [booking] = await db
    .select({
      id: bookings.id,
      shopId: bookings.shopId,
      customerId: bookings.customerId,
      staffId: bookings.staffId,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }

  assertCan(user, "message:read", {
    shopId: booking.shopId,
    customerId: booking.customerId,
    assignedStaffId: booking.staffId,
  });

  // Get active shop members for this shop to accurately distinguish roles
  const members = await db
    .select({
      userId: shopMembers.userId,
      role: shopMembers.role,
    })
    .from(shopMembers)
    .where(and(eq(shopMembers.shopId, booking.shopId), eq(shopMembers.active, true)));

  const memberRoleMap = new Map<string, "owner" | "manager" | "staff">();
  for (const m of members) {
    memberRoleMap.set(m.userId, m.role);
  }

  const rows = await db
    .select({
      id: messages.id,
      bookingId: messages.bookingId,
      senderId: messages.senderId,
      body: messages.body,
      imagePath: messages.imagePath,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderPhone: users.phone,
      senderPlatformRole: users.platformRole,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.bookingId, bookingId))
    .orderBy(asc(messages.createdAt));

  return rows.map((r) => {
    let role: SenderRole = "customer";
    if (r.senderPlatformRole === "admin" || r.senderPlatformRole === "super_admin") {
      role = "admin";
    } else {
      const shopR = memberRoleMap.get(r.senderId);
      if (shopR) {
        role = shopR;
      }
    }

    const displayName = r.senderName || (role !== "customer" ? "Shop Staff" : "Customer");

    return {
      id: r.id,
      bookingId: r.bookingId,
      senderId: r.senderId,
      senderName: displayName,
      senderRole: role,
      isMe: r.senderId === user.id,
      body: r.body,
      imagePath: r.imagePath,
      imageUrl: r.imagePath ? mediaUrl(r.imagePath) : null,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/**
 * Returns available quick replies for a shop (predefined templates + shop custom replies).
 */
export async function getShopQuickReplies(shopId: string): Promise<QuickReplyItem[]> {
  const customRows = await db
    .select({
      id: quickReplies.id,
      shopId: quickReplies.shopId,
      title: quickReplies.title,
      body: quickReplies.body,
      sortOrder: quickReplies.sortOrder,
    })
    .from(quickReplies)
    .where(eq(quickReplies.shopId, shopId))
    .orderBy(asc(quickReplies.sortOrder), asc(quickReplies.createdAt));

  const customItems: QuickReplyItem[] = customRows.map((r) => ({
    id: r.id,
    shopId: r.shopId,
    title: r.title,
    body: r.body,
    category: "Shop Custom",
    sortOrder: r.sortOrder,
    isCustom: true,
  }));

  return [...customItems, ...DEFAULT_QUICK_REPLIES];
}

/**
 * Returns the unread messages count on a booking for the current user.
 */
export async function getBookingUnreadCount(bookingId: string): Promise<number> {
  const user = await requireUser();

  const [res] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.bookingId, bookingId),
        ne(messages.senderId, user.id),
        isNull(messages.readAt),
      ),
    );

  return res?.count ?? 0;
}

export type BookingChatContext = {
  bookingId: string;
  refCode: string;
  status: string;
  startAt: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  serviceName: string;
  customerId: string | null;
  customerName: string;
  isCustomer: boolean;
  canManageQuickReplies: boolean;
  messages: ChatMessage[];
  quickReplies: QuickReplyItem[];
};

/**
 * Fetches complete chat context for a booking view.
 */
export async function getBookingChatContext(bookingId: string): Promise<BookingChatContext | null> {
  const user = await requireUser();

  const [booking] = await db
    .select({
      id: bookings.id,
      refCode: bookings.refCode,
      status: bookings.status,
      startAt: bookings.startAt,
      shopId: bookings.shopId,
      customerId: bookings.customerId,
      staffId: bookings.staffId,
      shopName: shops.name,
      shopSlug: shops.slug,
      serviceName: services.name,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(bookings)
    .innerJoin(shops, eq(shops.id, bookings.shopId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(users, eq(users.id, bookings.customerId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return null;

  assertCan(user, "message:read", {
    shopId: booking.shopId,
    customerId: booking.customerId,
    assignedStaffId: booking.staffId,
  });

  const isCustomer = user.id === booking.customerId;
  const isShopMember = user.memberships.some(
    (m) => m.shopId === booking.shopId && ["owner", "manager", "staff"].includes(m.role),
  );
  const canManageQuickReplies = user.memberships.some(
    (m) => m.shopId === booking.shopId && ["owner", "manager"].includes(m.role),
  );

  const [messagesList, quickRepliesList] = await Promise.all([
    getBookingMessages(bookingId),
    isShopMember ? getShopQuickReplies(booking.shopId) : Promise.resolve([]),
  ]);

  return {
    bookingId: booking.id,
    refCode: booking.refCode,
    status: booking.status,
    startAt: booking.startAt.toISOString(),
    shopId: booking.shopId,
    shopName: booking.shopName,
    shopSlug: booking.shopSlug,
    serviceName: booking.serviceName,
    customerId: booking.customerId,
    customerName: booking.customerName || booking.customerPhone || "Customer",
    isCustomer,
    canManageQuickReplies,
    messages: messagesList,
    quickReplies: quickRepliesList,
  };
}
