// Allowed values for text status and type columns. The database enforces the
// same lists with CHECK constraints; text plus CHECK (not Postgres enums) keeps
// the schema usable through the RDS Data API after the AWS move.

export const PLATFORM_ROLES = ["customer", "admin", "super_admin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const USER_STATUSES = ["active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SHOP_STATUSES = ["draft", "pending", "active", "suspended"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const SHOP_ROLES = ["owner", "manager", "staff"] as const;
export type ShopRole = (typeof SHOP_ROLES)[number];

export const BOOKING_TYPES = ["slot", "home", "quote", "queue"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const PRICE_TYPES = ["fixed", "starts_at", "quote"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const BOOKING_STATUSES = [
  "requested",
  "quoted",
  "confirmed",
  "declined",
  "expired",
  "cancelled",
  "completed",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["sms", "push", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const MEDIA_OWNER_TYPES = ["shop", "service", "review"] as const;
export type MediaOwnerType = (typeof MEDIA_OWNER_TYPES)[number];

export const MEDIA_KINDS = ["photo", "document"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
