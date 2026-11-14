"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestEmailOtp,
  requestPhoneOtp,
  verifyEmailOtpAction,
  verifyPhoneOtpAction,
} from "@/features/auth/actions";
import { OTP_COUNTDOWN_SECONDS } from "@/features/auth/constants";
import { formatPhone } from "@/lib/phone";

type VerifyOtpFormProps = {
  phone?: string;
  email?: string;
  next?: string;
};

export function VerifyOtpForm({ phone, email, next = "/account" }: VerifyOtpFormProps) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState(OTP_COUNTDOWN_SECONDS);

  // Timer countdown
  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const targetIdentifier = phone ? formatPhone(phone) : (email ?? "");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (phone) {
        const result = await verifyPhoneOtpAction({ phone, code, next });
        if (result.ok) {
          router.push(result.data.next || "/account");
          router.refresh();
        } else {
          setError(result.message);
          setLoading(false);
        }
      } else if (email) {
        const result = await verifyEmailOtpAction({ email, code, next });
        if (result.ok) {
          router.push(result.data.next || "/account");
          router.refresh();
        } else {
          setError(result.message);
          setLoading(false);
        }
      }
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setError(null);
    setSuccessNotice(null);
    setResending(true);

    try {
      if (phone) {
        const result = await requestPhoneOtp({ phone });
        if (result.ok) {
          setSuccessNotice("New code sent via SMS!");
          setSecondsLeft(OTP_COUNTDOWN_SECONDS);
        } else {
          setError(result.message);
        }
      } else if (email) {
        const result = await requestEmailOtp({ email });
        if (result.ok) {
          setSuccessNotice("New code sent to your email!");
          setSecondsLeft(OTP_COUNTDOWN_SECONDS);
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError("Unable to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-normal tracking-tight text-navy-900">
          Enter verification code
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a 6-digit code to{" "}
          <strong className="font-semibold text-navy-900">{targetIdentifier}</strong>
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

      {successNotice && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-success/30 bg-green-50 p-4 text-sm text-success"
        >
          {successNotice}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label htmlFor="otp-input" className="sr-only">
            6-digit verification code
          </label>
          <Input
            id="otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="······"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(val);
              if (error) setError(null);
            }}
            className="h-14 text-center font-mono text-2xl tracking-[0.5em] focus-visible:ring-2 sm:text-3xl"
            autoFocus
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full bg-orange-500 font-semibold text-navy-900 hover:bg-orange-600"
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
              Verifying...
            </span>
          ) : (
            "Verify and continue"
          )}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm">
        {secondsLeft > 0 ? (
          <p className="text-slate-500">
            Resend code in <span className="font-medium text-navy-900">{secondsLeft}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-medium text-orange-700 underline underline-offset-2 hover:text-orange-800 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Didn't get the code? Resend"}
          </button>
        )}

        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
        >
          Entered the wrong {phone ? "phone number" : "email"}? Go back
        </Link>
      </div>
    </div>
  );
}
