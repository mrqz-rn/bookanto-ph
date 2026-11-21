"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signOutAction,
  startTwoFactorSetupAction,
  verifyTwoFactorAction,
} from "@/features/auth/actions";

type Enrollment = { factorId: string; qrCode: string; secret: string };

type TwoFactorFormProps = {
  /** The account's verified authenticator, or null when it still needs setting up. */
  factorId: string | null;
  next: string;
};

/** Sets up an authenticator app (first time) or asks for its 6-digit code. */
export function TwoFactorForm({ factorId, next }: TwoFactorFormProps) {
  const router = useRouter();
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const activeFactorId = factorId ?? enrollment?.factorId ?? null;
  const settingUp = !factorId;

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startTwoFactorSetupAction();
      if (result.ok) setEnrollment(result.data);
      else setError(result.message);
    } catch {
      setError("We couldn't start two-factor setup. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFactorId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyTwoFactorAction({ factorId: activeFactorId, code, next });
      if (result.ok) {
        router.replace(result.data.next);
        router.refresh();
        return;
      }
      setError(result.message);
      setCode("");
    } catch {
      setError("We couldn't check the code. Check your connection and try again.");
    }
    setBusy(false);
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-50 text-green-700">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900">
          {settingUp ? "Protect the admin console" : "Two-factor sign-in"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {settingUp
            ? "Admin accounts need a second step at sign-in. Set up an authenticator app once; after that, enter its 6-digit code each time."
            : "Open your authenticator app and enter the 6-digit code for BooKanto."}
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

      {settingUp && !enrollment ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            <li>
              Install an authenticator app on your phone: Google Authenticator, Microsoft
              Authenticator or 1Password all work.
            </li>
            <li>Tap the button below and scan the QR code with the app.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <Button type="button" className="h-12 w-full" onClick={startSetup} disabled={busy}>
            <KeyRound aria-hidden />
            {busy ? "Preparing..." : "Set up authenticator app"}
          </Button>
        </div>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          {enrollment && (
            <div className="space-y-3 rounded-xl border border-border bg-white p-4 text-center">
              {/* A data: URL from Supabase Auth; next/image can't optimize it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="QR code to add BooKanto to your authenticator app"
                width={192}
                height={192}
                className="mx-auto size-48"
              />
              <div>
                <p className="text-xs text-slate-600">Can&apos;t scan? Enter this key instead:</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm break-all text-navy-900">
                    {enrollment.secret}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={copySecret}
                    aria-label={copied ? "Key copied" : "Copy key"}
                  >
                    <Copy aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="totp-code" className="mb-1.5 block text-sm font-medium text-navy-900">
              6-digit code
            </label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono text-xl tracking-[0.4em]"
              required
              disabled={busy}
              autoFocus
            />
          </div>

          <Button type="submit" className="h-12 w-full" disabled={busy || code.length !== 6}>
            {busy ? "Checking..." : settingUp ? "Turn on two-factor" : "Continue"}
          </Button>
        </form>
      )}

      <form action={signOutAction} className="mt-6 text-center">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 hover:text-navy-900 hover:underline"
        >
          Not you? Sign out
        </button>
      </form>
    </div>
  );
}
