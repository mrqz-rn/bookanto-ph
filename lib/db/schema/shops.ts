import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { geographyPoint, id, isSlug, oneOf, timestamps } from "./columns";
import {
  BOOKING_TYPES,
  MEDIA_KINDS,
  MEDIA_OWNER_TYPES,
  PRICE_TYPES,
  SHOP_ROLES,
  SHOP_STATUSES,
} from "./enums";
import { barangays, cities } from "./places";
import { users } from "./users";

export const shops = pgTable(
  "shops",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    address: text("address"),
    barangayId: uuid("barangay_id").references(() => barangays.id),
    cityId: uuid("city_id").references(() => cities.id),
    location: geographyPoint("location"),
    phone: text("phone"),
    status: text("status", { enum: SHOP_STATUSES }).notNull().default("draft"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("shops_slug_key").on(t.slug),
    index("shops_city_id_status_idx").on(t.cityId, t.status),
    index("shops_location_idx").using("gist", t.location),
    check("shops_slug_check", isSlug(t.slug)),
    check("shops_status_check", oneOf(t.status, SHOP_STATUSES)),
  ],
).enableRLS();

export const shopMembers = pgTable(
  "shop_members",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: SHOP_ROLES }).notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("shop_members_shop_id_user_id_key").on(t.shopId, t.userId),
    // Loaded with the current user on every signed-in request.
    index("shop_members_user_id_idx").on(t.userId),
    check("shop_members_role_check", oneOf(t.role, SHOP_ROLES)),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: id(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    defaultBookingType: text("default_booking_type", { enum: BOOKING_TYPES })
      .notNull()
      .default("slot"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("categories_slug_key").on(t.slug),
    check("categories_slug_check", isSlug(t.slug)),
    check("categories_default_booking_type_check", oneOf(t.defaultBookingType, BOOKING_TYPES)),
  ],
).enableRLS();

export const shopCategories = pgTable(
  "shop_categories",
  {
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.shopId, t.categoryId] }),
    // Category and city pages look shops up by category.
    index("shop_categories_category_id_idx").on(t.categoryId),
  ],
).enableRLS();

export const services = pgTable(
  "services",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id),
    name: text("name").notNull(),
    description: text("description"),
    priceType: text("price_type", { enum: PRICE_TYPES }).notNull().default("fixed"),
    // Null only for quote-priced services.
    priceCentavos: integer("price_centavos"),
    durationMin: integer("duration_min").notNull(),
    bookingType: text("booking_type", { enum: BOOKING_TYPES }).notNull().default("slot"),
    capacity: integer("capacity").notNull().default(1),
    bufferMin: integer("buffer_min").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("services_shop_id_active_idx").on(t.shopId, t.active),
    check("services_price_type_check", oneOf(t.priceType, PRICE_TYPES)),
    check("services_booking_type_check", oneOf(t.bookingType, BOOKING_TYPES)),
    check(
      "services_price_check",
      sql`(${t.priceType} = 'quote' or ${t.priceCentavos} is not null) and (${t.priceCentavos} is null or ${t.priceCentavos} >= 0)`,
    ),
    check("services_duration_min_check", sql`${t.durationMin} > 0`),
    check("services_capacity_check", sql`${t.capacity} >= 1`),
    check("services_buffer_min_check", sql`${t.bufferMin} >= 0`),
  ],
).enableRLS();

// Times are Manila wall-clock times. A weekday without a row is closed.
export const businessHours = pgTable(
  "business_hours",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    // 0 = Sunday … 6 = Saturday.
    weekday: smallint("weekday").notNull(),
    opens: time("opens").notNull(),
    closes: time("closes").notNull(),
    breakStart: time("break_start"),
    breakEnd: time("break_end"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("business_hours_shop_id_weekday_key").on(t.shopId, t.weekday),
    check("business_hours_weekday_check", sql`${t.weekday} between 0 and 6`),
    check("business_hours_break_check", sql`(${t.breakStart} is null) = (${t.breakEnd} is null)`),
  ],
).enableRLS();

export const closures = pgTable(
  "closures",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    ...timestamps(),
  },
  (t) => [
    index("closures_shop_id_starts_at_idx").on(t.shopId, t.startsAt),
    check("closures_range_check", sql`${t.endsAt} > ${t.startsAt}`),
  ],
).enableRLS();

// Photos and documents for shops, services and reviews. Paths point into
// storage: public bucket for photos, private bucket for documents.
export const media = pgTable(
  "media",
  {
    id: id(),
    ownerType: text("owner_type", { enum: MEDIA_OWNER_TYPES }).notNull(),
    ownerId: uuid("owner_id").notNull(),
    path: text("path").notNull(),
    kind: text("kind", { enum: MEDIA_KINDS }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("media_owner_type_owner_id_idx").on(t.ownerType, t.ownerId),
    check("media_owner_type_check", oneOf(t.ownerType, MEDIA_OWNER_TYPES)),
    check("media_kind_check", oneOf(t.kind, MEDIA_KINDS)),
  ],
).enableRLS();

// Old shop slugs, so renamed shops keep their search rankings through a 301.
export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: id(),
    fromSlug: text("from_slug").notNull(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [uniqueIndex("slug_redirects_from_slug_key").on(t.fromSlug)],
).enableRLS();

export type Shop = typeof shops.$inferSelect;
export type NewShop = typeof shops.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type BusinessHour = typeof businessHours.$inferSelect;
export type NewBusinessHour = typeof businessHours.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
