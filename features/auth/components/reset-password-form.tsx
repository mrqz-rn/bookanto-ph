"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/features/auth/actions";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/features/auth/constants";

type FieldErrors = { password?: string; confirmPassword?: string };

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [linkDead, setLinkDead] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "The passwords don't match." });
      return;
    }
    setBusy(true);
    try {
      const result = await resetPasswordAction({ token, password, confirmPassword });
      if (result.ok) {
        router.replace("/login?reset=done");
        return;
      }
      if (result.fieldErrors?.password || result.fieldErrors?.confirmPassword) {
        setFieldErrors({
          password: result.fieldErrors.password?.[0],
          confirmPassword: result.fieldErrors.confirmPassword?.[0],
        });
      } else {
        setError(result.message);
        setLinkDead(/expired|already used|isn't valid/i.test(result.message));
      }
    } catch {
      setError("We couldn't change your password. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This link works once and expires {PASSWORD_RESET_TTL_MINUTES} minutes after it was sent.
          After the change you&apos;ll be signed out on your other devices.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-danger/30 bg-red-50 p-4 text-sm text-danger"
        >
          {error}
          {linkDead && (
            <Link
              href="/forgot-password"
              className="mt-2 flex min-h-11 items-center font-semibold text-green-700 underline underline-offset-2"
            >
              Send a new link
            </Link>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-navy-900">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="new-password-hint"
            required
            disabled={busy || linkDead}
          />
          <p
            id="new-password-hint"
            className={`mt-1.5 text-xs ${fieldErrors.password ? "text-danger" : "text-slate-500"}`}
          >
            {fieldErrors.password ?? `At least ${PASSWORD_MIN_LENGTH} characters.`}
          </p>
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-sm font-medium text-navy-900"
          >
            Type it again
          </label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
            required
            disabled={busy || linkDead}
          />
          {fieldErrors.confirmPassword && (
            <p id="confirm-password-error" className="mt-1.5 text-xs text-danger">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="h-12 w-full"
          disabled={busy || linkDead || !password || !confirmPassword}
        >
          {busy ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
