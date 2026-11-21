"use client";

import * as React from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { PASSWORD_RESET_TTL_MINUTES } from "@/features/auth/constants";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await requestPasswordResetAction({ email });
      if (result.ok) setSentTo(email.trim());
      else setError(result.fieldErrors?.email?.[0] ?? result.message);
    } catch {
      setError("We couldn't send the link. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {sentTo ? (
        <div className="text-center" role="status">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-50 text-green-700">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            If <span className="font-semibold text-navy-900">{sentTo}</span> has a BooKanto account,
            we&apos;ve sent it a link to choose a new password. The link works once and expires in{" "}
            {PASSWORD_RESET_TTL_MINUTES} minutes.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            No email after a few minutes? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="font-medium text-green-700 underline underline-offset-2"
            >
              try again
            </button>
            .
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter the email you sign in with. We&apos;ll send you a link to choose a new password.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-danger/30 bg-red-50 p-4 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="mb-1.5 block text-sm font-medium text-navy-900"
              >
                Email address
              </label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="juan.delacruz@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <Button type="submit" className="h-12 w-full" disabled={busy || !email.trim()}>
              {busy ? "Sending link..." : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Remembered it?{" "}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center font-semibold text-green-700 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
