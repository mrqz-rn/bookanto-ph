import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyOtpForm } from "@/features/auth/components/verify-otp-form";
import { PHONE_AUTH_ENABLED } from "@/features/auth/constants";

export const metadata: Metadata = {
  title: "Verify Code",
  description: "Enter your 6-digit verification code to complete sign in.",
};

type VerifyPageProps = {
  searchParams: Promise<{ phone?: string; email?: string; next?: string }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { phone: phoneParam, email, next } = await searchParams;
  const phone = PHONE_AUTH_ENABLED ? phoneParam : undefined;

  if (!phone && !email) {
    redirect("/login");
  }

  return <VerifyOtpForm phone={phone} email={email} next={next} />;
}
