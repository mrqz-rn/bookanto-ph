import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQuickReply,
  deleteQuickReply,
  markRead,
  sendMessage,
} from "@/features/messages/actions";
import type { CurrentUser } from "@/lib/auth";

const testBookingId = "11111111-1111-4111-a111-111111111111";
const testShopId = "22222222-2222-4222-a222-222222222222";
const testCustomerId = "33333333-3333-4333-a333-333333333333";
const testStaffId = "44444444-4444-4444-a444-444444444444";
const testOtherId = "55555555-5555-4555-a555-555555555555";

let mockUser: CurrentUser | null = {
  id: testCustomerId,
  authId: "auth-123",
  name: "Juan Customer",
  phone: "+639171234567",
  email: "juan@example.com",
  platformRole: "customer",
  status: "active",
  memberships: [],
};

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => {
    if (!mockUser) {
      const { AppError } = await import("@/lib/errors");
      throw new AppError("UNAUTHENTICATED");
    }
    return mockUser;
  }),
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
    update: () => mockUpdate(),
    delete: () => mockDelete(),
  },
}));

vi.mock("@/lib/realtime", () => ({
  publishBookingMessage: vi.fn(async () => {}),
  publishBookingRead: vi.fn(async () => {}),
}));

vi.mock("@/lib/storage", () => ({
  uploadPhoto: vi.fn(async (path: string) => ({
    path,
    url: `https://mock-supabase.co/storage/v1/object/public/media/${path}`,
  })),
}));

describe("messages actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: testCustomerId,
      authId: "auth-123",
      name: "Juan Customer",
      phone: "+639171234567",
      email: "juan@example.com",
      platformRole: "customer",
      status: "active",
      memberships: [],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendMessage", () => {
    it("fails when unauthenticated", async () => {
      mockUser = null;
      const res = await sendMessage({
        bookingId: testBookingId,
        body: "Hello",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("fails when booking does not exist", async () => {
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      });

      const res = await sendMessage({
        bookingId: testBookingId,
        body: "Hello",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("NOT_FOUND");
      }
    });

    it("fails when user does not have message:send permission on someone else's booking", async () => {
      mockUser = {
        id: testOtherId,
        authId: "auth-other",
        name: "Stranger",
        phone: "+639179999999",
        email: "stranger@example.com",
        platformRole: "customer",
        status: "active",
        memberships: [],
      };

      // Mock booking belongs to testCustomerId
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: testBookingId,
                shopId: testShopId,
                customerId: testCustomerId,
                staffId: testStaffId,
                status: "confirmed",
              },
            ],
          }),
        }),
      });

      const res = await sendMessage({
        bookingId: testBookingId,
        body: "Hello unauthorized",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });

    it("enforces rate limit of 30 messages a minute", async () => {
      // 1. Booking select
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: testBookingId,
                shopId: testShopId,
                customerId: testCustomerId,
                staffId: testStaffId,
                status: "confirmed",
              },
            ],
          }),
        }),
      });

      // 2. Rate limit count returns 30
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: async () => [{ count: 30 }],
        }),
      });

      const res = await sendMessage({
        bookingId: testBookingId,
        body: "Too fast message",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("RATE_LIMITED");
        expect(res.message).toContain("30 messages per minute");
      }
    });

    it("successfully sends a text message", async () => {
      // 1. Booking select
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: testBookingId,
                shopId: testShopId,
                customerId: testCustomerId,
                staffId: testStaffId,
                status: "confirmed",
              },
            ],
          }),
        }),
      });

      // 2. Rate limit count returns 2
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: async () => [{ count: 2 }],
        }),
      });

      // 3. Insert message
      mockInsert.mockReturnValueOnce({
        values: () => ({
          returning: async () => [
            {
              id: "msg-created-1",
              bookingId: testBookingId,
              senderId: testCustomerId,
              body: "Hi shop! Confirming my slot.",
              imagePath: null,
              readAt: null,
              createdAt: new Date("2026-11-15T10:00:00Z"),
              updatedAt: new Date("2026-11-15T10:00:00Z"),
            },
          ],
        }),
      });

      const res = await sendMessage({
        bookingId: testBookingId,
        body: "Hi shop! Confirming my slot.",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.id).toBe("msg-created-1");
        expect(res.data.body).toBe("Hi shop! Confirming my slot.");
        expect(res.data.isMe).toBe(true);
        expect(res.data.senderRole).toBe("customer");
      }
    });

    it("validates and uploads a photo attachment", async () => {
      // 1. Booking select
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: testBookingId,
                shopId: testShopId,
                customerId: testCustomerId,
                staffId: testStaffId,
                status: "confirmed",
              },
            ],
          }),
        }),
      });

      // 2. Rate limit count returns 0
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: async () => [{ count: 0 }],
        }),
      });

      // 3. Insert message
      mockInsert.mockReturnValueOnce({
        values: () => ({
          returning: async () => [
            {
              id: "msg-photo-1",
              bookingId: testBookingId,
              senderId: testCustomerId,
              body: "Gate photo",
              imagePath: "messages/sample-gate.png",
              readAt: null,
              createdAt: new Date("2026-11-15T10:00:00Z"),
              updatedAt: new Date("2026-11-15T10:00:00Z"),
            },
          ],
        }),
      });

      // Valid 1x1 PNG base64
      const validPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

      const res = await sendMessage({
        bookingId: testBookingId,
        body: "Gate photo",
        imageBase64: validPngBase64,
        imageName: "gate.png",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.imagePath).toContain("messages/");
        expect(res.data.imageUrl).toContain("/storage/v1/object/public/media/messages/");
      }
    });

    it("rejects invalid photo bytes that disguise non-images", async () => {
      // 1. Booking select
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: testBookingId,
                shopId: testShopId,
                customerId: testCustomerId,
                staffId: testStaffId,
                status: "confirmed",
              },
            ],
          }),
        }),
      });

      // 2. Rate limit count returns 0
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: async () => [{ count: 0 }],
        }),
      });

      // Fake base64 text disguised as photo
      const fakeBase64 = Buffer.from("NOT AN IMAGE CONTENT").toString("base64");

      const res = await sendMessage({
        bookingId: testBookingId,
        imageBase64: fakeBase64,
        imageName: "fake.jpg",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("VALIDATION");
        expect(res.message).toContain("Only genuine JPEG, PNG, and WebP");
      }
    });
  });

  describe("markRead", () => {
    it("updates unread messages and returns count", async () => {
      // 1. Booking check
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: testBookingId,
                shopId: testShopId,
                customerId: testCustomerId,
                staffId: testStaffId,
              },
            ],
          }),
        }),
      });

      // 2. Update returning updated rows
      mockUpdate.mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: async () => [{ id: "msg-1" }, { id: "msg-2" }],
          }),
        }),
      });

      const res = await markRead({ bookingId: testBookingId });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.updatedCount).toBe(2);
      }
    });
  });

  describe("quick replies management", () => {
    it("allows shop owner/manager to create custom quick reply", async () => {
      mockUser = {
        id: "owner-1",
        authId: "auth-owner",
        name: "Shop Owner",
        phone: "+639178888888",
        email: "owner@example.com",
        platformRole: "customer",
        status: "active",
        memberships: [{ shopId: testShopId, role: "owner" }],
      };

      mockInsert.mockReturnValueOnce({
        values: () => ({
          returning: async () => [
            {
              id: "qr-custom-1",
              shopId: testShopId,
              title: "Gate Directions",
              body: "Enter through Gate 2.",
              sortOrder: 0,
            },
          ],
        }),
      });

      const res = await createQuickReply({
        shopId: testShopId,
        title: "Gate Directions",
        body: "Enter through Gate 2.",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.title).toBe("Gate Directions");
        expect(res.data.isCustom).toBe(true);
      }
    });

    it("denies regular customers from managing quick replies", async () => {
      // mockUser is regular customer without membership in testShopId
      const res = await createQuickReply({
        shopId: testShopId,
        title: "Disallowed",
        body: "Should fail",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });

    it("allows shop owner to delete custom quick reply", async () => {
      mockUser = {
        id: "owner-1",
        authId: "auth-owner",
        name: "Shop Owner",
        phone: "+639178888888",
        email: "owner@example.com",
        platformRole: "customer",
        status: "active",
        memberships: [{ shopId: testShopId, role: "owner" }],
      };

      mockDelete.mockReturnValueOnce({
        where: async () => {},
      });

      const res = await deleteQuickReply({
        shopId: testShopId,
        id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      });

      expect(res.ok).toBe(true);
    });
  });
});
