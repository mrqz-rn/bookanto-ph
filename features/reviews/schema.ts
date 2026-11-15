import { z } from "zod";

import {
  MAX_COMMENT_LENGTH,
  MAX_PHOTO_SIZE_BYTES,
  MAX_REPLY_LENGTH,
  MAX_REVIEW_PHOTOS,
  REPORT_REASONS,
} from "./constants";

const reportReasonValues = REPORT_REASONS.map((r) => r.value) as [
  (typeof REPORT_REASONS)[number]["value"],
  ...(typeof REPORT_REASONS)[number]["value"][],
];

export const createReviewSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  comment: z
    .string()
    .trim()
    .max(MAX_COMMENT_LENGTH, `Comment must not exceed ${MAX_COMMENT_LENGTH} characters`)
    .optional(),
  photoPaths: z
    .array(z.string().trim().min(1, "Photo path cannot be empty").max(500))
    .max(MAX_REVIEW_PHOTOS, `Maximum ${MAX_REVIEW_PHOTOS} photos allowed`)
    .default([]),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const replyToReviewSchema = z.strictObject({
  reviewId: z.string().uuid("Invalid review ID"),
  shopId: z.string().uuid("Invalid shop ID"),
  reply: z
    .string()
    .trim()
    .min(1, "Reply cannot be empty")
    .max(MAX_REPLY_LENGTH, `Reply must not exceed ${MAX_REPLY_LENGTH} characters`),
});

export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;

export const reportReviewSchema = z.strictObject({
  reviewId: z.string().uuid("Invalid review ID"),
  reason: z
    .string()
    .trim()
    .min(3, "Please provide a reason (at least 3 characters)")
    .max(1000, "Reason must not exceed 1000 characters"),
  reasonType: z.enum(reportReasonValues).optional(),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;

export const hideReviewSchema = z.strictObject({
  reviewId: z.string().uuid("Invalid review ID"),
  hidden: z.boolean().default(true),
});

export type HideReviewInput = z.infer<typeof hideReviewSchema>;

export const resolveReportSchema = z.strictObject({
  reportId: z.string().uuid("Invalid report ID"),
  status: z.enum(["resolved", "dismissed"]),
  resolution: z
    .string()
    .trim()
    .min(1, "Resolution cannot be empty")
    .max(1000, "Resolution must not exceed 1000 characters"),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const addReviewPhotoSchema = z.strictObject({
  reviewId: z.string().uuid("Invalid review ID"),
  path: z.string().trim().min(1, "Path cannot be empty").max(500),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

export type AddReviewPhotoInput = z.infer<typeof addReviewPhotoSchema>;

export const removeReviewPhotoSchema = z.strictObject({
  reviewId: z.string().uuid("Invalid review ID"),
  mediaId: z.string().uuid("Invalid media ID"),
});

export type RemoveReviewPhotoInput = z.infer<typeof removeReviewPhotoSchema>;

export const uploadReviewPhotoFileSchema = z.strictObject({
  reviewId: z.string().uuid("Invalid review ID").optional(),
  fileSize: z.number().int().max(MAX_PHOTO_SIZE_BYTES, "Photo size exceeds the 8 MB limit"),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileName: z.string().min(1).max(255),
});

export type UploadReviewPhotoFileInput = z.infer<typeof uploadReviewPhotoFileSchema>;
