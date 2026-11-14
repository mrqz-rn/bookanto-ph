import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { id, oneOf, timestamps } from "./columns";
import { PLATFORM_ROLES, USER_STATUSES } from "./enums";

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
