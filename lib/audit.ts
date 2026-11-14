import "server-only";

import { db, type DbExecutor } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export type AuditEntry = {
  /** Null for actions taken by the system. */
  actorId: string | null;
  /** What happened, for example "shop.verified" or "booking.viewed_by_admin". */
  action: string;
  targetType: string;
  targetId: string;
  /** Never OTPs, tokens or full phone numbers. */
  data?: Record<string, unknown>;
  ip?: string | null;
};

/** Records a sensitive action. Pass `tx` to write inside the action's transaction. */
export async function writeAudit(entry: AuditEntry, executor: DbExecutor = db): Promise<void> {
  await executor.insert(auditLog).values(entry);
}
