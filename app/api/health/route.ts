import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// Polled every minute by the uptime monitor.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
