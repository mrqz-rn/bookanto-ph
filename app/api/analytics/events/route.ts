import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import { trackEventSchema } from "@/features/analytics/schema";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = trackEventSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid event data" }, { status: 400 });
    }

    const data = parsed.data;
    const user = await getCurrentUser();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    await db.insert(analyticsEvents).values({
      eventName: data.eventName,
      sessionId: data.sessionId,
      userId: user?.id ?? null,
      shopId: data.shopId ?? null,
      serviceId: data.serviceId ?? null,
      bookingId: data.bookingId ?? null,
      step: data.step ?? null,
      metadata: (data.metadata as Record<string, unknown>) ?? null,
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.warn("Analytics event ingest failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
