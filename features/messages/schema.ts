import { z } from "zod";

import {
  MAX_MESSAGE_LENGTH,
  MAX_QUICK_REPLY_BODY_LENGTH,
  MAX_QUICK_REPLY_TITLE_LENGTH,
} from "./constants";

export const sendMessageSchema = z
  .strictObject({
    bookingId: z.string().uuid("Invalid booking identifier"),
    body: z
      .string()
      .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
      .optional()
      .nullable(),
    imageBase64: z.string().optional().nullable(),
    imageName: z.string().max(255).optional().nullable(),
  })
  .refine(
    (data) => {
      const hasText = typeof data.body === "string" && data.body.trim().length > 0;
      const hasImage = typeof data.imageBase64 === "string" && data.imageBase64.length > 0;
      return hasText || hasImage;
    },
    {
      message: "Please enter a message or attach a photo",
      path: ["body"],
    },
  );

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const markReadSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking identifier"),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;

export const createQuickReplySchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop identifier"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      MAX_QUICK_REPLY_TITLE_LENGTH,
      `Title cannot exceed ${MAX_QUICK_REPLY_TITLE_LENGTH} characters`,
    ),
  body: z
    .string()
    .min(1, "Message content is required")
    .max(
      MAX_QUICK_REPLY_BODY_LENGTH,
      `Message cannot exceed ${MAX_QUICK_REPLY_BODY_LENGTH} characters`,
    ),
});

export type CreateQuickReplyInput = z.infer<typeof createQuickReplySchema>;

export const deleteQuickReplySchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop identifier"),
  id: z.string().uuid("Invalid quick reply identifier"),
});

export type DeleteQuickReplyInput = z.infer<typeof deleteQuickReplySchema>;
