import { sql } from "drizzle-orm";
import { check, index, inet, pgTable, text } from "drizzle-orm/pg-core";

import { id, oneOf, timestamps } from "./columns";
import { INQUIRY_KINDS, INQUIRY_STATUSES } from "./enums";

// Messages from the landing page's contact form: shop owners, business
// partners and investors.
export const inquiries = pgTable(
  "inquiries",
  {
    id: id(),
    kind: text("kind", { enum: INQUIRY_KINDS }).notNull(),
    name: text("name").notNull(),
    email: text("email"),
    // E.164
    phone: text("phone"),
    businessName: text("business_name"),
    city: text("city"),
    message: text("message").notNull(),
    status: text("status", { enum: INQUIRY_STATUSES }).notNull().default("new"),
    // Only for limiting how often one sender can submit.
    ip: inet("ip"),
    ...timestamps(),
  },
  (t) => [
    index("inquiries_status_created_at_idx").on(t.status, t.createdAt),
    index("inquiries_ip_created_at_idx").on(t.ip, t.createdAt),
    check("inquiries_kind_check", oneOf(t.kind, INQUIRY_KINDS)),
    check("inquiries_status_check", oneOf(t.status, INQUIRY_STATUSES)),
    check("inquiries_contact_check", sql`${t.email} is not null or ${t.phone} is not null`),
    check(
      "inquiries_length_check",
      sql`char_length(${t.name}) <= 100 and char_length(${t.message}) <= 2000
        and coalesce(char_length(${t.email}), 0) <= 200
        and coalesce(char_length(${t.businessName}), 0) <= 150
        and coalesce(char_length(${t.city}), 0) <= 100`,
    ),
  ],
).enableRLS();
