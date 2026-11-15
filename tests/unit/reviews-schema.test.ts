import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  addReviewPhotoSchema,
  createReviewSchema,
  hideReviewSchema,
  removeReviewPhotoSchema,
  replyToReviewSchema,
  reportReviewSchema,
  resolveReportSchema,
} from "@/features/reviews/schema";

describe("reviews schemas", () => {
  const validBookingId = randomUUID();
  const validShopId = randomUUID();
  const validReviewId = randomUUID();
  const validReportId = randomUUID();
  const validMediaId = randomUUID();

  describe("createReviewSchema", () => {
    it("accepts a valid review with rating and comment", () => {
      const res = createReviewSchema.safeParse({
        bookingId: validBookingId,
        rating: 5,
        comment: "Napakahusay ng service! Malinis at mabait ang barber.",
        photoPaths: ["reviews/photo1.jpg", "reviews/photo2.jpg"],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.rating).toBe(5);
        expect(res.data.photoPaths).toHaveLength(2);
      }
    });

    it("accepts a review without comment or photos", () => {
      const res = createReviewSchema.safeParse({
        bookingId: validBookingId,
        rating: 4,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.photoPaths).toEqual([]);
      }
    });

    it("rejects ratings outside 1-5 or non-integers", () => {
      expect(
        createReviewSchema.safeParse({
          bookingId: validBookingId,
          rating: 0,
        }).success,
      ).toBe(false);

      expect(
        createReviewSchema.safeParse({
          bookingId: validBookingId,
          rating: 6,
        }).success,
      ).toBe(false);

      expect(
        createReviewSchema.safeParse({
          bookingId: validBookingId,
          rating: 4.5,
        }).success,
      ).toBe(false);
    });

    it("rejects more than 5 photos", () => {
      const res = createReviewSchema.safeParse({
        bookingId: validBookingId,
        rating: 5,
        photoPaths: [
          "photo1.jpg",
          "photo2.jpg",
          "photo3.jpg",
          "photo4.jpg",
          "photo5.jpg",
          "photo6.jpg",
        ],
      });
      expect(res.success).toBe(false);
    });

    it("rejects comments exceeding 2000 characters", () => {
      const res = createReviewSchema.safeParse({
        bookingId: validBookingId,
        rating: 5,
        comment: "a".repeat(2001),
      });
      expect(res.success).toBe(false);
    });

    it("rejects unexpected fields (strictObject)", () => {
      const res = createReviewSchema.safeParse({
        bookingId: validBookingId,
        rating: 5,
        isAdmin: true,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("replyToReviewSchema", () => {
    it("accepts a valid shop reply", () => {
      const res = replyToReviewSchema.safeParse({
        reviewId: validReviewId,
        shopId: validShopId,
        reply: "Maraming salamat po sa pagbisita! Balik po kayo ulit.",
      });
      expect(res.success).toBe(true);
    });

    it("rejects empty or whitespace-only replies", () => {
      expect(
        replyToReviewSchema.safeParse({
          reviewId: validReviewId,
          shopId: validShopId,
          reply: "   ",
        }).success,
      ).toBe(false);
    });

    it("rejects replies exceeding 2000 characters", () => {
      expect(
        replyToReviewSchema.safeParse({
          reviewId: validReviewId,
          shopId: validShopId,
          reply: "x".repeat(2001),
        }).success,
      ).toBe(false);
    });
  });

  describe("reportReviewSchema", () => {
    it("accepts a valid report with reason and reasonType", () => {
      const res = reportReviewSchema.safeParse({
        reviewId: validReviewId,
        reason: "Contains inappropriate vulgar language.",
        reasonType: "offensive",
      });
      expect(res.success).toBe(true);
    });

    it("rejects reason with less than 3 characters", () => {
      expect(
        reportReviewSchema.safeParse({
          reviewId: validReviewId,
          reason: "no",
        }).success,
      ).toBe(false);
    });

    it("rejects invalid reasonType", () => {
      expect(
        reportReviewSchema.safeParse({
          reviewId: validReviewId,
          reason: "Valid reason text here",
          reasonType: "invalid_category",
        }).success,
      ).toBe(false);
    });
  });

  describe("hideReviewSchema", () => {
    it("accepts valid hide input with default true", () => {
      const res = hideReviewSchema.safeParse({
        reviewId: validReviewId,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.hidden).toBe(true);
      }
    });

    it("accepts explicit unhide (hidden: false)", () => {
      const res = hideReviewSchema.safeParse({
        reviewId: validReviewId,
        hidden: false,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.hidden).toBe(false);
      }
    });
  });

  describe("resolveReportSchema", () => {
    it("accepts resolution for report", () => {
      const res = resolveReportSchema.safeParse({
        reportId: validReportId,
        status: "resolved",
        resolution: "Review hidden after confirming terms violation.",
      });
      expect(res.success).toBe(true);
    });

    it("accepts dismissal of report", () => {
      const res = resolveReportSchema.safeParse({
        reportId: validReportId,
        status: "dismissed",
        resolution: "Does not violate community standards.",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(
        resolveReportSchema.safeParse({
          reportId: validReportId,
          status: "pending",
          resolution: "some text",
        }).success,
      ).toBe(false);
    });
  });

  describe("addReviewPhotoSchema & removeReviewPhotoSchema", () => {
    it("accepts valid photo addition", () => {
      const res = addReviewPhotoSchema.safeParse({
        reviewId: validReviewId,
        path: "reviews/my-photo.jpg",
        sortOrder: 1,
      });
      expect(res.success).toBe(true);
    });

    it("accepts valid photo removal", () => {
      const res = removeReviewPhotoSchema.safeParse({
        reviewId: validReviewId,
        mediaId: validMediaId,
      });
      expect(res.success).toBe(true);
    });
  });
});
