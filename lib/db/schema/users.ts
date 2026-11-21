import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { geographyPoint, id, oneOf, timestamps } from "./columns";
import { PLATFORM_ROLES, USER_STATUSES } from "./enums";
import { barangays, cities } from "./places";

export const users = pgTable(
  "users",
  {
    id: id(),
    // The auth provider's user id: Supabase Auth now, Cognito after the AWS move.
    authId: text("auth_id").notNull(),
    // E.164, for example +639171234567.
    phone: text("phone"),
    name: text("name"),
    email: text("email"),
    platformRole: text("platform_role", { enum: PLATFORM_ROLES }).notNull().default("customer"),
    status: text("status", { enum: USER_STATUSES }).notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("users_auth_id_key").on(t.authId),
    uniqueIndex("users_phone_key").on(t.phone),
    check("users_platform_role_check", oneOf(t.platformRole, PLATFORM_ROLES)),
    check("users_status_check", oneOf(t.status, USER_STATUSES)),
    check("users_phone_e164_check", sql`${t.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
).enableRLS();

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    recipientName: text("recipient_name"),
    phone: text("phone"),
    streetAddress: text("street_address").notNull(),
    cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
    barangayId: uuid("barangay_id").references(() => barangays.id, { onDelete: "set null" }),
    notes: text("notes"),
    location: geographyPoint("location"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    index("user_addresses_user_id_idx").on(t.userId),
    index("user_addresses_city_id_idx").on(t.cityId),
    index("user_addresses_barangay_id_idx").on(t.barangayId),
    check("user_addresses_label_len_check", sql`char_length(${t.label}) <= 50`),
    check("user_addresses_street_len_check", sql`char_length(${t.streetAddress}) <= 300`),
  ],
).enableRLS();

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;

// Password reset links (features/auth). The emailed link carries a random
// token; only its SHA-256 is stored. A link works once, for 10 minutes, and a
// newer request replaces older unused links.
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("password_reset_tokens_token_hash_key").on(t.tokenHash),
    index("password_reset_tokens_user_id_idx").on(t.userId),
  ],
).enableRLS();
