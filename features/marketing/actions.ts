"use server";

import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { inquiries } from "@/lib/db/schema/inquiries";
import { AppError, parseInput, runAction, type FieldErrors } from "@/lib/errors";
import { getClientIp } from "@/lib/request";

import { INQUIRY_FIELDS, inquiryInput, type InquiryField } from "./schema";

/** One sender may send this many messages an hour. */
const MAX_PER_HOUR = 5;

export type InquiryFormState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
  /** What was typed, so the form can show it again after an error. */
  values?: Partial<Record<InquiryField, string>>;
};

/**
 * The landing page's contact form. Public: no session or permission step.
 * Spam control is a hidden honeypot field plus a per-IP hourly limit.
 */
export async function submitInquiry(
  _previous: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  // Read only the known fields; React adds its own to the form data.
  const values = Object.fromEntries(
    INQUIRY_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as Record<InquiryField, string>;

  // People never see the "website" field; bots fill it in. Pretend it worked.
  if (formData.get("website")) return { status: "sent" };

  const result = await runAction(async () => {
    const inquiry = parseInput(inquiryInput, values);
    const ip = await getClientIp();

    if (ip) {
      const [recent] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inquiries)
        .where(and(eq(inquiries.ip, ip), gt(inquiries.createdAt, sql`now() - interval '1 hour'`)));
      if ((recent?.count ?? 0) >= MAX_PER_HOUR) throw new AppError("RATE_LIMITED");
    }

    await db.insert(inquiries).values({ ...inquiry, ip });
    return null;
  });

  if (result.ok) return { status: "sent" };
  return {
    status: "error",
    message: result.message,
    ...(result.fieldErrors && { fieldErrors: result.fieldErrors }),
    values,
  };
}
