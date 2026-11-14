import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyOtpForm } from "@/features/auth/components/verify-otp-form";

export const metadata: Metadata = {
  title: "Verify Code",
  description: "Enter your 6-digit verification code to complete sign in.",
};

type VerifyPageProps = {
  searchParams: Promise<{ phone?: string; email?: string; next?: string }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { phone, email, next } = await searchParams;

  if (!phone && !email) {
    redirect("/login");
  }

  return <VerifyOtpForm phone={phone} email={email} next={next} />;
}
