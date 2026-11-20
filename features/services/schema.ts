import { z } from "zod";

import { BOOKING_TYPES, MEMBERSHIP_CADENCES, PRICE_TYPES } from "@/lib/db/schema/enums";

export const serviceBaseSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Service name must be at least 2 characters.")
    .max(100, "Service name is too long."),
  description: z.string().trim().max(1000, "Description is too long.").optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID.").optional().nullable(),
  priceType: z.enum(PRICE_TYPES),
  priceCentavos: z.number().int().min(0, "Price cannot be negative.").optional().nullable(),
  durationMin: z
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes.")
    .max(1440, "Duration cannot exceed 24 hours."),
  bookingType: z.enum(BOOKING_TYPES),
  capacity: z.number().int().min(1, "Capacity must be at least 1.").default(1),
  bufferMin: z.number().int().min(0, "Buffer minutes cannot be negative.").default(0),
  active: z.boolean().default(true),
});

export const createServiceSchema = serviceBaseSchema
  .extend({
    shopId: z.string().uuid("Invalid shop ID."),
  })
  .refine(
    (data) =>
      data.priceType === "quote" ||
      (data.priceCentavos !== null && data.priceCentavos !== undefined),
    {
      message: "Please enter a valid price for fixed or starts-at services.",
      path: ["priceCentavos"],
    },
  );

export const updateServiceSchema = serviceBaseSchema
  .extend({
    serviceId: z.string().uuid("Invalid service ID."),
    shopId: z.string().uuid("Invalid shop ID."),
  })
  .refine(
    (data) =>
      data.priceType === "quote" ||
      (data.priceCentavos !== null && data.priceCentavos !== undefined),
    {
      message: "Please enter a valid price for fixed or starts-at services.",
      path: ["priceCentavos"],
    },
  );

export const deleteServiceSchema = z.strictObject({
  serviceId: z.string().uuid("Invalid service ID."),
  shopId: z.string().uuid("Invalid shop ID."),
});

export const reorderServicesSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  serviceIds: z.array(z.string().uuid()).min(1),
});

export const archiveServiceSchema = z.strictObject({
  serviceId: z.string().uuid("Invalid service ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  active: z.boolean(),
});

export const addServicePhotoSchema = z.strictObject({
  serviceId: z.string().uuid("Invalid service ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  path: z.string().min(1, "Photo storage path is required.").optional(),
  imageBase64: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const removeServicePhotoSchema = z.strictObject({
  serviceId: z.string().uuid("Invalid service ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  mediaId: z.string().uuid("Invalid media ID."),
});

export const createServiceAddonSchema = z.strictObject({
  serviceId: z.string().uuid("Invalid service ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  name: z.string().trim().min(1, "Add-on name is required.").max(100, "Add-on name is too long."),
  description: z.string().trim().max(500).optional().nullable(),
  priceCentavos: z.number().int().min(0, "Price cannot be negative.").default(0),
  durationMin: z.number().int().min(0, "Duration cannot be negative.").default(0),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateServiceAddonSchema = z.strictObject({
  addonId: z.string().uuid("Invalid add-on ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  name: z.string().trim().min(1, "Add-on name is required.").max(100, "Add-on name is too long."),
  description: z.string().trim().max(500).optional().nullable(),
  priceCentavos: z.number().int().min(0, "Price cannot be negative."),
  durationMin: z.number().int().min(0, "Duration cannot be negative."),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).optional(),
});

export const deleteServiceAddonSchema = z.strictObject({
  addonId: z.string().uuid("Invalid add-on ID."),
  shopId: z.string().uuid("Invalid shop ID."),
});

export const createPackageSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  name: z
    .string()
    .trim()
    .min(2, "Package name must be at least 2 characters.")
    .max(100, "Package name is too long."),
  description: z.string().trim().max(1000).optional().nullable(),
  priceCentavos: z.number().int().min(0, "Package price cannot be negative."),
  originalPriceCentavos: z.number().int().min(0).optional().nullable(),
  active: z.boolean().default(true),
  serviceItems: z
    .array(
      z.strictObject({
        serviceId: z.string().uuid("Invalid service ID."),
        quantity: z.number().int().min(1, "Quantity must be at least 1.").default(1),
      }),
    )
    .min(1, "Please include at least one service in the package."),
});

export const updatePackageSchema = z.strictObject({
  packageId: z.string().uuid("Invalid package ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  name: z
    .string()
    .trim()
    .min(2, "Package name must be at least 2 characters.")
    .max(100, "Package name is too long."),
  description: z.string().trim().max(1000).optional().nullable(),
  priceCentavos: z.number().int().min(0, "Package price cannot be negative."),
  originalPriceCentavos: z.number().int().min(0).optional().nullable(),
  active: z.boolean(),
  serviceItems: z
    .array(
      z.strictObject({
        serviceId: z.string().uuid("Invalid service ID."),
        quantity: z.number().int().min(1).default(1),
      }),
    )
    .min(1, "Please include at least one service in the package."),
});

export const deletePackageSchema = z.strictObject({
  packageId: z.string().uuid("Invalid package ID."),
  shopId: z.string().uuid("Invalid shop ID."),
});

export const createMembershipSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  name: z
    .string()
    .trim()
    .min(2, "Membership name must be at least 2 characters.")
    .max(100, "Membership name is too long."),
  description: z.string().trim().max(1000).optional().nullable(),
  priceCentavos: z.number().int().min(0, "Price cannot be negative."),
  cadence: z.enum(MEMBERSHIP_CADENCES),
  sessionCredits: z.number().int().min(1).optional().nullable(),
  validityDays: z.number().int().min(1).optional().nullable(),
  perks: z.string().trim().max(1000).optional().nullable(),
  active: z.boolean().default(true),
});

export const updateMembershipSchema = z.strictObject({
  membershipId: z.string().uuid("Invalid membership ID."),
  shopId: z.string().uuid("Invalid shop ID."),
  name: z
    .string()
    .trim()
    .min(2, "Membership name must be at least 2 characters.")
    .max(100, "Membership name is too long."),
  description: z.string().trim().max(1000).optional().nullable(),
  priceCentavos: z.number().int().min(0, "Price cannot be negative."),
  cadence: z.enum(MEMBERSHIP_CADENCES),
  sessionCredits: z.number().int().min(1).optional().nullable(),
  validityDays: z.number().int().min(1).optional().nullable(),
  perks: z.string().trim().max(1000).optional().nullable(),
  active: z.boolean(),
});

export const deleteMembershipSchema = z.strictObject({
  membershipId: z.string().uuid("Invalid membership ID."),
  shopId: z.string().uuid("Invalid shop ID."),
});

export const templateItemSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  priceType: z.enum(PRICE_TYPES),
  priceCentavos: z.number().int().min(0).optional().nullable(),
  durationMin: z.number().int().min(5).max(1440),
  bookingType: z.enum(BOOKING_TYPES),
  capacity: z.number().int().min(1).default(1),
  bufferMin: z.number().int().min(0).default(0),
  suggestedAddons: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1).max(100),
        description: z.string().trim().max(500).optional(),
        priceCentavos: z.number().int().min(0),
        durationMin: z.number().int().min(0),
      }),
    )
    .optional(),
});

export const applyServiceTemplatesSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  categoryId: z.string().uuid("Invalid category ID.").optional().nullable(),
  templates: z.array(templateItemSchema).min(1, "Select at least one template service to add."),
});

export const importedServiceRowSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  priceType: z.enum(PRICE_TYPES).default("fixed"),
  priceCentavos: z.number().int().min(0).optional().nullable(),
  durationMin: z.number().int().min(5).max(1440).default(30),
  bookingType: z.enum(BOOKING_TYPES).default("slot"),
  capacity: z.number().int().min(1).default(1),
  bufferMin: z.number().int().min(0).default(0),
  categoryName: z.string().trim().optional().nullable(),
});

export const bulkImportServicesSchema = z.strictObject({
  shopId: z.string().uuid("Invalid shop ID."),
  categoryId: z.string().uuid("Invalid category ID.").optional().nullable(),
  services: z
    .array(importedServiceRowSchema)
    .min(1, "No services to import.")
    .max(100, "Maximum 100 services can be imported in a single batch."),
});
