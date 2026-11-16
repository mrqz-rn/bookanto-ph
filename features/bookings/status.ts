import "server-only";

import { sql } from "drizzle-orm";

import type { DbExecutor } from "@/lib/db";
import type { BookingStatus } from "@/lib/db/schema/enums";
import { AppError } from "@/lib/errors";

/** Raised by change_booking_status() when the booking isn't in the expected status any more. */
const STALE = "BK001";
/** Raised when the lifecycle doesn't allow the move. */
const NOT_ALLOWED = "BK002";

function sqlState(error: unknown): string | undefined {
  const withCode = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? String((value as { code: unknown }).code)
      : undefined;
  return withCode(error) ?? withCode((error as { cause?: unknown } | null)?.cause);
}

/**
 * Moves a booking from `from` to `to` through change_booking_status(), the
 * only way the database lets a status change. It checks the move against the
 * lifecycle and records it in booking_events. Throws CONFLICT when the
 * booking changed meanwhile. Pass the action's transaction.
 */
export async function changeBookingStatus(
  tx: DbExecutor,
  change: {
    bookingId: string;
    from: BookingStatus;
    to: BookingStatus;
    /** Null for the system (expiry). */
    actorId: string | null;
    reason?: string | null;
  },
): Promise<void> {
  try {
    await tx.execute(
      sql`select public.change_booking_status(${change.bookingId}::uuid, ${change.from}, ${change.to}, ${change.actorId}::uuid, ${change.reason ?? null})`,
    );
  } catch (error) {
    const state = sqlState(error);
    if (state === STALE || state === NOT_ALLOWED) {
      throw new AppError("CONFLICT", "This booking just changed. Please refresh and try again.");
    }
    throw error;
  }
}
