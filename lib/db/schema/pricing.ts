import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { id, oneOf, timestamps } from "./columns";
import { MEMBERSHIP_CADENCES } from "./enums";
import { services, shops } from "./shops";

// Add-ons that customers can add to a service (e.g. "Hair wash", "Beard trim").
export const serviceAddons = pgTable(
  "service_addons",
  {
    id: id(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCentavos: integer("price_centavos").notNull().default(0),
    durationMin: integer("duration_min").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("service_addons_service_id_active_idx").on(t.serviceId, t.active),
    check("service_addons_price_check", sql`${t.priceCentavos} >= 0`),
    check("service_addons_duration_check", sql`${t.durationMin} >= 0`),
    check("service_addons_name_len_check", sql`char_length(${t.name}) between 1 and 100`),
  ],
).enableRLS();

// Packages that bundle multiple services together with a package price.
export const packages = pgTable(
  "packages",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCentavos: integer("price_centavos").notNull(),
    originalPriceCentavos: integer("original_price_centavos"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("packages_shop_id_active_idx").on(t.shopId, t.active),
    check("packages_price_check", sql`${t.priceCentavos} >= 0`),
    check("packages_name_len_check", sql`char_length(${t.name}) between 1 and 100`),
  ],
).enableRLS();

// Services included inside a package.
export const packageItems = pgTable(
  "package_items",
  {
    id: id(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    index("package_items_package_id_idx").on(t.packageId),
    check("package_items_quantity_check", sql`${t.quantity} >= 1`),
  ],
).enableRLS();

// Memberships and prepaid session passes (e.g. Monthly Unlimited, 5-Session Pass).
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCentavos: integer("price_centavos").notNull(),
    cadence: text("cadence", { enum: MEMBERSHIP_CADENCES }).notNull().default("monthly"),
    sessionCredits: integer("session_credits"),
    validityDays: integer("validity_days"),
    perks: text("perks"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("memberships_shop_id_active_idx").on(t.shopId, t.active),
    check("memberships_price_check", sql`${t.priceCentavos} >= 0`),
    check("memberships_cadence_check", oneOf(t.cadence, MEMBERSHIP_CADENCES)),
    check("memberships_name_len_check", sql`char_length(${t.name}) between 1 and 100`),
  ],
).enableRLS();

export type ServiceAddon = typeof serviceAddons.$inferSelect;
export type NewServiceAddon = typeof serviceAddons.$inferInsert;
export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;
export type PackageItem = typeof packageItems.$inferSelect;
export type NewPackageItem = typeof packageItems.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
