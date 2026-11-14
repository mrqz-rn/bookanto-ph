import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your BooKanto account using phone OTP, email, Google, or Facebook.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    redirect(destination);
  }

  const errorMessage =
    error === "auth_failed"
      ? "Login failed or was cancelled. Please try again."
      : error === "no_code"
        ? "No authorization code returned. Please try again."
        : undefined;

  return <LoginForm next={next} initialError={errorMessage} />;
}
