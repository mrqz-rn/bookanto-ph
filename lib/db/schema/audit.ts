import { index, inet, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { id, timestamps } from "./columns";
import { users } from "./users";

// Append-only (enforced by trigger). Never store OTPs, tokens or full phone
// numbers in `data`.
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    // Null for actions taken by the system.
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    ip: inet("ip"),
    ...timestamps(),
  },
  (t) => [index("audit_log_target_type_target_id_idx").on(t.targetType, t.targetId)],
).enableRLS();
