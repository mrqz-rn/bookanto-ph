import { z } from "zod";

import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_KINDS,
  BOOKING_TYPES,
  FRAUD_SEVERITIES,
  FRAUD_SIGNAL_TYPES,
  FRAUD_STATUSES,
  FRAUD_TARGET_TYPES,
  PLATFORM_ROLES,
} from "@/lib/db/schema/enums";

// Strict Zod schemas for all admin actions.

export const verifyShopSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
});

export const rejectShopSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  reason: z.string().min(2, "Reason must be at least 2 characters.").max(500),
});

export const suspendShopSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  reason: z.string().min(2, "Reason must be at least 2 characters.").max(500),
});

export const unsuspendShopSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
});

export const upsertCategorySchema = z.strictObject({
  id: z.string().uuid("Invalid category ID.").optional(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters.")
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens."),
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  icon: z.string().min(1, "Icon is required.").max(50),
  defaultBookingType: z.enum(BOOKING_TYPES),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  parentId: z.string().uuid("Invalid parent category ID.").nullable().optional(),
});

export const toggleCategoryActiveSchema = z.strictObject({
  id: z.string().uuid("Invalid category ID."),
  active: z.boolean(),
});

export const deleteCategorySchema = z.strictObject({
  id: z.string().uuid("Invalid category ID."),
});

export const suspendUserSchema = z.strictObject({
  userId: z.string().uuid("Invalid user ID."),
  reason: z.string().min(2, "Reason must be at least 2 characters.").max(500),
});

export const unsuspendUserSchema = z.strictObject({
  userId: z.string().uuid("Invalid user ID."),
});

export const updateUserRoleSchema = z.strictObject({
  userId: z.string().uuid("Invalid user ID."),
  role: z.enum(PLATFORM_ROLES),
});

export const resolveDisputeSchema = z.strictObject({
  reportId: z.string().uuid("Invalid report ID."),
  status: z.enum(["resolved", "dismissed"]),
  resolution: z.string().min(2, "Resolution must be at least 2 characters.").max(1000),
  hideAssociatedReview: z.boolean().optional(),
});

export const createBookingDisputeSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
  reason: z.string().min(5, "Dispute reason must be at least 5 characters.").max(1000),
});

export const upsertAnnouncementSchema = z.strictObject({
  id: z.string().uuid("Invalid announcement ID.").optional(),
  title: z.string().min(2, "Title must be at least 2 characters.").max(150),
  message: z.string().min(5, "Message must be at least 5 characters.").max(1000),
  kind: z.enum(ANNOUNCEMENT_KINDS),
  targetAudience: z.enum(ANNOUNCEMENT_AUDIENCES),
  actionUrl: z
    .string()
    .url("Invalid URL format.")
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  actionLabel: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export const deleteAnnouncementSchema = z.strictObject({
  id: z.string().uuid("Invalid announcement ID."),
});

export const toggleAnnouncementActiveSchema = z.strictObject({
  id: z.string().uuid("Invalid announcement ID."),
  isActive: z.boolean(),
});

export const updateFraudSignalSchema = z.strictObject({
  id: z.string().uuid("Invalid fraud signal ID."),
  status: z.enum(FRAUD_STATUSES),
  resolutionNotes: z.string().max(1000).nullable().optional(),
});

export const createCustomFraudSignalSchema = z.strictObject({
  targetType: z.enum(FRAUD_TARGET_TYPES),
  targetId: z.string().uuid("Invalid target ID."),
  signalType: z.enum(FRAUD_SIGNAL_TYPES),
  severity: z.enum(FRAUD_SEVERITIES),
  score: z.number().int().min(0).max(100),
  notes: z.string().min(3, "Notes must be at least 3 characters.").max(500),
});

export const runFraudScanSchema = z.strictObject({});

export const logAdminBookingViewSchema = z.strictObject({
  bookingId: z.string().uuid("Invalid booking ID."),
});
