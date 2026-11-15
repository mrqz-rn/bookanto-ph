import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { resolvePostLoginPath } from "@/lib/home";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your BooKanto account using email or Google.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect(resolvePostLoginPath(user, next));
  }

  const errorMessage =
    error === "auth_failed"
      ? "Login failed or was cancelled. Please try again."
      : error === "no_code"
        ? "No authorization code returned. Please try again."
        : undefined;

  return <LoginForm next={next} initialError={errorMessage} />;
}
