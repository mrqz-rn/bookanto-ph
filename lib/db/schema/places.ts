import { boolean, check, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { geographyPoint, id, isSlug, timestamps } from "./columns";

export const cities = pgTable(
  "cities",
  {
    id: id(),
    name: text("name").notNull(),
    // Unique across the country because it is the first segment of
    // /[city]/[category] URLs; add the province for repeated names.
    slug: text("slug").notNull(),
    province: text("province").notNull(),
    center: geographyPoint("center"),
    isActive: boolean("is_active").notNull().default(false),
    ...timestamps(),
  },
  (t) => [uniqueIndex("cities_slug_key").on(t.slug), check("cities_slug_check", isSlug(t.slug))],
).enableRLS();

export const barangays = pgTable(
  "barangays",
  {
    id: id(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    center: geographyPoint("center"),
    isActive: boolean("is_active").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("barangays_city_id_slug_key").on(t.cityId, t.slug),
    check("barangays_slug_check", isSlug(t.slug)),
  ],
).enableRLS();
