import { NextRequest, NextResponse } from "next/server";

import { settleRefunds } from "@/features/bookings/payments";
import { env } from "@/lib/env";
import { expireStaleBookings, runAllScheduledJobs, sendBookingReminders } from "@/lib/jobs";

/**
 * Route handler for scheduled cron jobs (e.g. pg_cron, Vercel Cron, external monitor).
 * Protected by secret verification (Authorization header or x-cron-secret).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ job: string }> },
): Promise<NextResponse> {
  return handleCron(request, await context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ job: string }> },
): Promise<NextResponse> {
  return handleCron(request, await context.params);
}

async function handleCron(request: NextRequest, params: { job: string }): Promise<NextResponse> {
  // 1. Authorize: Check cron secret
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const providedSecret = secretHeader ?? bearerToken;

  if (env.CRON_SECRET && providedSecret !== env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Invalid or missing cron secret" },
      { status: 401 },
    );
  }

  const { job } = params;

  try {
    switch (job) {
      case "auto-expire":
      case "expire": {
        const result = await expireStaleBookings();
        return NextResponse.json({
          ok: true,
          job: "auto-expire",
          result,
          timestamp: new Date().toISOString(),
        });
      }

      case "reminders": {
        const result = await sendBookingReminders();
        return NextResponse.json({
          ok: true,
          job: "reminders",
          result,
          timestamp: new Date().toISOString(),
        });
      }

      case "refunds": {
        const result = await settleRefunds();
        return NextResponse.json({
          ok: true,
          job: "refunds",
          result,
          timestamp: new Date().toISOString(),
        });
      }

      case "all": {
        const result = await runAllScheduledJobs();
        return NextResponse.json({
          ok: true,
          job: "all",
          result,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown cron job: ${job}` }, { status: 404 });
    }
  } catch (error) {
    console.error(`[cron:${job}] Failed:`, error);
    return NextResponse.json(
      {
        ok: false,
        job,
        error: error instanceof Error ? error.message : "Internal error running job",
      },
      { status: 500 },
    );
  }
}
