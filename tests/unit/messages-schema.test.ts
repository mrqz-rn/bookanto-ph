import { describe, expect, it } from "vitest";

import {
  createQuickReplySchema,
  deleteQuickReplySchema,
  markReadSchema,
  sendMessageSchema,
} from "@/features/messages/schema";

describe("messages schemas", () => {
  const validBookingId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const validShopId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const validReplyId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

  describe("sendMessageSchema", () => {
    it("accepts a plain text message", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        body: "Hello, what time should I arrive?",
      });
      expect(res.success).toBe(true);
    });

    it("accepts a photo-only message with base64", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        imageBase64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        imageName: "photo.png",
      });
      expect(res.success).toBe(true);
    });

    it("accepts a message with both text and photo", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        body: "Here is the photo of the gate",
        imageBase64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      });
      expect(res.success).toBe(true);
    });

    it("rejects an empty message with neither text nor photo", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        body: "",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain("Please enter a message or attach a photo");
      }
    });

    it("rejects a whitespace-only message when no photo is provided", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        body: "   \n  \t  ",
      });
      expect(res.success).toBe(false);
    });

    it("rejects an invalid bookingId UUID", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: "not-a-uuid",
        body: "Hello",
      });
      expect(res.success).toBe(false);
    });

    it("rejects a message body exceeding 2000 characters", () => {
      const longText = "a".repeat(2001);
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        body: longText,
      });
      expect(res.success).toBe(false);
    });

    it("rejects unexpected extra keys (strict schema)", () => {
      const res = sendMessageSchema.safeParse({
        bookingId: validBookingId,
        body: "Hello",
        extraField: "not allowed",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("markReadSchema", () => {
    it("accepts a valid booking UUID", () => {
      const res = markReadSchema.safeParse({ bookingId: validBookingId });
      expect(res.success).toBe(true);
    });

    it("rejects invalid booking UUID", () => {
      const res = markReadSchema.safeParse({ bookingId: "invalid-id" });
      expect(res.success).toBe(false);
    });

    it("rejects unknown keys", () => {
      const res = markReadSchema.safeParse({
        bookingId: validBookingId,
        hackerField: true,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("createQuickReplySchema", () => {
    it("accepts valid quick reply", () => {
      const res = createQuickReplySchema.safeParse({
        shopId: validShopId,
        title: "On the way",
        body: "We are on our way to your location!",
      });
      expect(res.success).toBe(true);
    });

    it("rejects empty title or empty body", () => {
      expect(
        createQuickReplySchema.safeParse({
          shopId: validShopId,
          title: "",
          body: "Some body",
        }).success,
      ).toBe(false);

      expect(
        createQuickReplySchema.safeParse({
          shopId: validShopId,
          title: "Title",
          body: "",
        }).success,
      ).toBe(false);
    });

    it("rejects title exceeding 100 characters", () => {
      expect(
        createQuickReplySchema.safeParse({
          shopId: validShopId,
          title: "t".repeat(101),
          body: "Body",
        }).success,
      ).toBe(false);
    });

    it("rejects body exceeding 1000 characters", () => {
      expect(
        createQuickReplySchema.safeParse({
          shopId: validShopId,
          title: "Title",
          body: "b".repeat(1001),
        }).success,
      ).toBe(false);
    });
  });

  describe("deleteQuickReplySchema", () => {
    it("accepts valid shopId and id", () => {
      const res = deleteQuickReplySchema.safeParse({
        shopId: validShopId,
        id: validReplyId,
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid UUIDs", () => {
      expect(
        deleteQuickReplySchema.safeParse({
          shopId: "invalid",
          id: validReplyId,
        }).success,
      ).toBe(false);
    });
  });
});
