import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { PASSWORD_RESET_TTL_MINUTES } from "@/features/auth/constants";
import { getResetLinkState, type ResetLinkState } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your BooKanto account.",
  robots: { index: false, follow: false },
};

const DEAD_LINK_COPY: Record<Exclude<ResetLinkState, "valid">, { title: string; body: string }> = {
  expired: {
    title: "This link has expired",
    body: `Reset links work for ${PASSWORD_RESET_TTL_MINUTES} minutes. Request a new one and use it right away.`,
  },
  used: {
    title: "This link was already used",
    body: "Each reset link works once. If you didn't change your password, request a new link.",
  },
  invalid: {
    title: "This link isn't valid",
    body: "It may be incomplete, or a newer link replaced it. Use the latest email, or request a new link.",
  },
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  // Checked, not used up: only saving a new password claims the link.
  const state = await getResetLinkState(token);

  if (state === "valid" && token) {
    return <ResetPasswordForm token={token} />;
  }

  const copy = DEAD_LINK_COPY[state === "valid" ? "invalid" : state];
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-danger">
        <LinkIcon className="size-6" aria-hidden />
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
      <Button asChild className="mt-6 h-12 w-full">
        <Link href="/forgot-password">Send a new link</Link>
      </Button>
      <Button asChild variant="outline" className="mt-3 w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
