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

export const NOTIFICATION_CHANNELS = ["sms", "push", "email", "whatsapp", "viber"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_TEMPLATES = [
  "otp",
  "booking_confirmed",
  "booking_requested",
  "booking_reminder",
  "booking_auto_expired",
  "booking_cancelled",
  "booking_completed",
  "test_alert",
] as const;
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[number];

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const MEDIA_OWNER_TYPES = ["shop", "service", "review"] as const;
export type MediaOwnerType = (typeof MEDIA_OWNER_TYPES)[number];

export const MEDIA_KINDS = ["photo", "document"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEMBERSHIP_CADENCES = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "sessions_pack",
] as const;
export type MembershipCadence = (typeof MEMBERSHIP_CADENCES)[number];

export const INQUIRY_KINDS = ["shop", "business", "investor", "other"] as const;
export type InquiryKind = (typeof INQUIRY_KINDS)[number];

export const INQUIRY_STATUSES = ["new", "contacted", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

// How a shop takes money online for a booking.
export const PAYMENT_MODES = ["none", "deposit", "full"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DEPOSIT_TYPES = ["fixed", "percent"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "expired", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ANNOUNCEMENT_KINDS = ["info", "warning", "critical", "maintenance"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_AUDIENCES = ["all", "customers", "shops"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const FRAUD_TARGET_TYPES = ["user", "shop", "booking"] as const;
export type FraudTargetType = (typeof FRAUD_TARGET_TYPES)[number];

export const FRAUD_SIGNAL_TYPES = [
  "excessive_cancellations",
  "excessive_no_shows",
  "burst_bookings",
  "dispute_rate_high",
  "review_abuse",
  "suspicious_velocity",
  "custom",
] as const;
export type FraudSignalType = (typeof FRAUD_SIGNAL_TYPES)[number];

export const FRAUD_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type FraudSeverity = (typeof FRAUD_SEVERITIES)[number];

export const FRAUD_STATUSES = ["active", "investigating", "resolved", "dismissed"] as const;
export type FraudStatus = (typeof FRAUD_STATUSES)[number];
