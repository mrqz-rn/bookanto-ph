"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { bookings, messages, quickReplies } from "@/lib/db/schema";
import { AppError, parseInput, runAction, type ActionResult } from "@/lib/errors";
import { MAX_FILE_SIZE_BYTES, mediaUrl, validateImageBytes } from "@/lib/media";
import { publishBookingMessage, publishBookingRead } from "@/lib/realtime";
import { uploadPhoto } from "@/lib/storage";

import {
  RATE_LIMIT_MESSAGES_PER_MINUTE,
  type ChatMessage,
  type QuickReplyItem,
  type SenderRole,
} from "./constants";
import {
  createQuickReplySchema,
  deleteQuickReplySchema,
  markReadSchema,
  sendMessageSchema,
} from "./schema";

/**
 * Sends a message on a booking thread. Supports text and attached photos.
 * Enforces:
 * 1. requireUser()
 * 2. parseInput(sendMessageSchema)
 * 3. assertCan(user, "message:send")
 * 4. Rate limit: 30 messages a minute per user
 * 5. Photo validation (JPEG, PNG, WebP magic bytes, 8MB max)
 * 6. Realtime publish & cache revalidation
 */
export async function sendMessage(input: unknown): Promise<ActionResult<ChatMessage>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(sendMessageSchema, input);

    const [booking] = await db
      .select({
        id: bookings.id,
        shopId: bookings.shopId,
        customerId: bookings.customerId,
        staffId: bookings.staffId,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "message:send", {
      shopId: booking.shopId,
      customerId: booking.customerId,
      assignedStaffId: booking.staffId,
    });

    // Rate limit: 30 messages per minute
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const [recentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.senderId, user.id), gte(messages.createdAt, oneMinuteAgo)));

    if ((recentCount?.count ?? 0) >= RATE_LIMIT_MESSAGES_PER_MINUTE) {
      throw new AppError(
        "RATE_LIMITED",
        `You are sending messages too quickly. Limit is ${RATE_LIMIT_MESSAGES_PER_MINUTE} messages per minute.`,
      );
    }

    let imagePath: string | null = null;

    if (data.imageBase64) {
      const buffer = Buffer.from(data.imageBase64, "base64");
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        throw new AppError("VALIDATION", "Photo exceeds 8 MB size limit.");
      }

      const imgCheck = validateImageBytes(buffer);
      if (!imgCheck.valid || !imgCheck.format || !imgCheck.mimeType) {
        throw new AppError(
          "VALIDATION",
          "Invalid photo format. Only genuine JPEG, PNG, and WebP images are allowed.",
        );
      }

      const filename = `messages/${booking.id}/${Date.now()}-${randomUUID()}.${imgCheck.format}`;
      const uploadRes = await uploadPhoto(filename, buffer, imgCheck.mimeType);
      imagePath = uploadRes.path;
    }

    const trimmedBody = data.body ? data.body.trim() : null;

    const [row] = await db
      .insert(messages)
      .values({
        bookingId: booking.id,
        senderId: user.id,
        body: trimmedBody,
        imagePath,
      })
      .returning();

    if (!row) {
      throw new AppError("INTERNAL", "Failed to save message.");
    }
    const created = row;

    // Determine sender role from authenticated user state
    let senderRole: SenderRole = "customer";
    if (user.platformRole === "admin" || user.platformRole === "super_admin") {
      senderRole = "admin";
    } else {
      const membership = user.memberships.find((m) => m.shopId === booking.shopId);
      if (membership) {
        senderRole = membership.role;
      }
    }

    const chatMessage: ChatMessage = {
      id: created.id,
      bookingId: created.bookingId,
      senderId: user.id,
      senderName: user.name || (senderRole !== "customer" ? "Shop Staff" : "Customer"),
      senderRole,
      isMe: true,
      body: created.body,
      imagePath: created.imagePath,
      imageUrl: created.imagePath ? mediaUrl(created.imagePath) : null,
      readAt: null,
      createdAt: created.createdAt.toISOString(),
    };

    // Realtime broadcast to other participants
    await publishBookingMessage(booking.id, {
      ...chatMessage,
      isMe: false,
    });

    revalidatePath(`/account/bookings/${booking.id}`);
    revalidatePath(`/dashboard/bookings/${booking.id}`);
    revalidatePath("/dashboard/inbox");

    return chatMessage;
  });
}

/**
 * Marks all unread incoming messages in a booking as read.
 * Emits realtime read receipt to update sender's view.
 */
export async function markRead(
  input: unknown,
): Promise<ActionResult<{ success: true; updatedCount: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(markReadSchema, input);

    const [booking] = await db
      .select({
        id: bookings.id,
        shopId: bookings.shopId,
        customerId: bookings.customerId,
        staffId: bookings.staffId,
      })
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) {
      throw new AppError("NOT_FOUND", "Booking not found.");
    }

    assertCan(user, "message:read", {
      shopId: booking.shopId,
      customerId: booking.customerId,
      assignedStaffId: booking.staffId,
    });

    const now = new Date();
    const updated = await db
      .update(messages)
      .set({ readAt: now })
      .where(
        and(
          eq(messages.bookingId, data.bookingId),
          ne(messages.senderId, user.id),
          isNull(messages.readAt),
        ),
      )
      .returning({ id: messages.id });

    if (updated.length > 0) {
      await publishBookingRead(data.bookingId, {
        readAt: now.toISOString(),
        readBy: user.id,
      });

      revalidatePath(`/account/bookings/${data.bookingId}`);
      revalidatePath(`/dashboard/bookings/${data.bookingId}`);
      revalidatePath("/dashboard/inbox");
    }

    return { success: true, updatedCount: updated.length };
  });
}

/**
 * Creates a custom quick reply template for a shop.
 * Restricted to shop owners and managers.
 */
export async function createQuickReply(input: unknown): Promise<ActionResult<QuickReplyItem>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(createQuickReplySchema, input);

    assertCan(user, "quick_reply:manage", { shopId: data.shopId });

    const [replyRow] = await db
      .insert(quickReplies)
      .values({
        shopId: data.shopId,
        title: data.title.trim(),
        body: data.body.trim(),
      })
      .returning();

    if (!replyRow) {
      throw new AppError("INTERNAL", "Failed to create quick reply.");
    }
    const created = replyRow;

    revalidatePath("/dashboard/inbox");

    return {
      id: created.id,
      shopId: created.shopId,
      title: created.title,
      body: created.body,
      category: "Shop Custom",
      sortOrder: created.sortOrder,
      isCustom: true,
    };
  });
}

/**
 * Deletes a custom quick reply template for a shop.
 * Restricted to shop owners and managers.
 */
export async function deleteQuickReply(input: unknown): Promise<ActionResult<{ success: true }>> {
  return runAction(async () => {
    const user = await requireUser();
    const data = parseInput(deleteQuickReplySchema, input);

    assertCan(user, "quick_reply:manage", { shopId: data.shopId });

    await db
      .delete(quickReplies)
      .where(and(eq(quickReplies.id, data.id), eq(quickReplies.shopId, data.shopId)));

    revalidatePath("/dashboard/inbox");

    return { success: true };
  });
}
