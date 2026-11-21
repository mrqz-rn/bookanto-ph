import { z } from "zod";

import { DOCUMENT_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/file-types";
import { isInPhilippines } from "@/lib/geo";
import { isValidPhilippinePhone, normalizePhone } from "@/lib/phone";

import { DOCUMENT_TYPES, type DocumentTypeId } from "./constants";

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const phoneSchema = z
  .string()
  .transform((val) => normalizePhone(val))
  .refine(isValidPhilippinePhone, {
    message: "Enter a valid Philippine mobile number (e.g. 0917 123 4567).",
  });

export const createShopSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Shop name must be at least 2 characters.")
    .max(100, "Shop name is too long (max 100 characters)."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "URL slug must be at least 2 characters.")
    .max(80, "URL slug is too long.")
    .regex(SLUG_REGEX, "Slug can only contain lowercase letters, numbers, and hyphens."),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters.")
    .optional()
    .nullable(),
  phone: phoneSchema,
  categoryIds: z
    .array(z.string().uuid("Invalid category ID."))
    .min(1, "Please select at least one service category."),
});

export const updateShopDetailsSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  name: z
    .string()
    .trim()
    .min(2, "Shop name must be at least 2 characters.")
    .max(100, "Shop name is too long."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "URL slug must be at least 2 characters.")
    .max(80, "URL slug is too long.")
    .regex(SLUG_REGEX, "Slug can only contain lowercase letters, numbers, and hyphens."),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters.")
    .optional()
    .nullable(),
  phone: phoneSchema,
  categoryIds: z
    .array(z.string().uuid("Invalid category ID."))
    .min(1, "Please select at least one service category."),
});

export const updateShopLocationSchema = z
  .strictObject({
    shopId: z.string().uuid("Invalid shop ID."),
    address: z
      .string()
      .trim()
      .min(5, "Address must be at least 5 characters.")
      .max(300, "Address is too long."),
    cityId: z.string().uuid("Invalid city ID.").optional().nullable(),
    barangayId: z.string().uuid("Invalid barangay ID.").optional().nullable(),
    lat: z.number().finite("Latitude must be a valid number."),
    lng: z.number().finite("Longitude must be a valid number."),
  })
  .refine((data) => isInPhilippines(data.lat, data.lng), {
    message: "Shop coordinates must be within the Philippines.",
    path: ["lat"],
  });

export const businessHourEntrySchema = z
  .strictObject({
    weekday: z.number().int().min(0).max(6),
    opens: z.string().regex(TIME_REGEX, "Opening time must be in HH:MM format."),
    closes: z.string().regex(TIME_REGEX, "Closing time must be in HH:MM format."),
    breakStart: z
      .string()
      .regex(TIME_REGEX, "Break start must be in HH:MM format.")
      .optional()
      .nullable(),
    breakEnd: z
      .string()
      .regex(TIME_REGEX, "Break end must be in HH:MM format.")
      .optional()
      .nullable(),
  })
  .refine((row) => row.closes > row.opens, {
    message: "Closing time must be after opening time.",
    path: ["closes"],
  })
  .refine(
    (row) =>
      (!row.breakStart && !row.breakEnd) ||
      (!!row.breakStart && !!row.breakEnd && row.breakEnd > row.breakStart),
    {
      message: "Break end time must be after break start time.",
      path: ["breakEnd"],
    },
  );

export const updateShopHoursSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  hours: z.array(businessHourEntrySchema).max(7),
});

export const addShopPhotoSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  path: z.string().min(1, "Photo storage path is required.").optional(),
  imageBase64: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const removeShopMediaSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  mediaId: z.string().uuid("Invalid media ID."),
});

export const reorderShopMediaSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  mediaIds: z.array(z.string().uuid()).min(1),
});

const documentTypeSchema = z.enum(
  DOCUMENT_TYPES.map((doc) => doc.type) as [DocumentTypeId, ...DocumentTypeId[]],
  "Choose which document this is.",
);

/** Step 1 of a document upload: ask for a one-time upload URL. */
export const startShopDocumentUploadSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  documentType: documentTypeSchema,
  contentType: z.enum(DOCUMENT_MIME_TYPES, "Upload a PDF, JPEG, PNG or WebP file."),
  size: z
    .number()
    .int()
    .positive("The file is empty.")
    .max(MAX_FILE_SIZE_BYTES, "The file is larger than 8 MB."),
});

/** Step 2: confirm the uploaded file so the server can check it and record it. */
export const confirmShopDocumentSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  documentType: documentTypeSchema,
  path: z.string().min(1).max(300),
});

/**
 * Whether `path` has the shape startShopDocumentUpload hands out for this shop
 * and document type: `<shopId>/<type>-<uuid>.<ext>`.
 */
export function isShopDocumentPath(path: string, shopId: string, documentType: string): boolean {
  const prefix = `${shopId}/${documentType}-`;
  if (!path.startsWith(prefix)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/.test(
    path.slice(prefix.length),
  );
}

export const submitForVerificationSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
});

export const setAcceptingTodaySchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  accepting: z.boolean(),
});

export const addStaffMemberSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name is too long (max 100 characters)."),
  phone: phoneSchema,
  email: z.string().trim().email("Please provide a valid email address.").optional().nullable(),
  role: z.enum(["manager", "staff"]).default("staff"),
});

export const updateStaffRoleSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  userId: z.string().uuid("Invalid user ID."),
  role: z.enum(["manager", "staff"]),
});

export const removeStaffMemberSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  userId: z.string().uuid("Invalid user ID."),
});

export const toggleStaffActiveSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  userId: z.string().uuid("Invalid user ID."),
  active: z.boolean(),
});
