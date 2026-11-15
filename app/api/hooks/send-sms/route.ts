import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { renderNotificationTemplate, smsProvider } from "@/lib/notify";
import { normalizePhone } from "@/lib/phone";

/**
 * Supabase Send SMS Webhook route handler.
 * Called by Supabase Auth whenever an SMS OTP is triggered.
 * Per blueprint: verifies secret, checks HTTP method, returns JSON.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check secret/signature if configured
  if (env.SUPABASE_SMS_HOOK_SECRET) {
    const authHeader = request.headers.get("authorization");
    const secretHeader =
      request.headers.get("x-hook-secret") ?? request.headers.get("x-supabase-signature");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const provided = secretHeader ?? bearer;

    if (provided !== env.SUPABASE_SMS_HOOK_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Invalid hook secret" },
        { status: 401 },
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Extract phone number from Supabase hook format or generic format
  let rawPhone: string | undefined;
  let otpCode: string | undefined;
  let customMessage: string | undefined;

  if (body.user && typeof body.user === "object") {
    const user = body.user as { phone?: string };
    rawPhone = user.phone;
  }
  if (body.sms && typeof body.sms === "object") {
    const sms = body.sms as { otp?: string; message?: string };
    otpCode = sms.otp;
    customMessage = sms.message;
  }

  if (!rawPhone && typeof body.phone === "string") {
    rawPhone = body.phone;
  }
  if (!otpCode && typeof body.otp === "string") {
    otpCode = body.otp;
  }
  if (!customMessage && typeof body.message === "string") {
    customMessage = body.message;
  }

  if (!rawPhone) {
    return NextResponse.json({ ok: false, error: "Missing phone number" }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);

  // Format message text
  let textToSend = customMessage;
  if (!textToSend && otpCode) {
    const content = renderNotificationTemplate("otp", { otp: otpCode });
    textToSend = content.smsText;
  }

  if (!textToSend) {
    return NextResponse.json(
      { ok: false, error: "Missing message text or OTP code" },
      { status: 400 },
    );
  }

  const result = await smsProvider.sendSms({
    to: phone,
    text: textToSend,
  });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: "Failed to dispatch SMS", details: result.messageId },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
  });
}
