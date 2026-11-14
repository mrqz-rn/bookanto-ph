"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestEmailOtp, requestPhoneOtp } from "@/features/auth/actions";
import { SocialAuthButtons } from "./social-auth-buttons";

type LoginFormProps = {
  next?: string;
  initialError?: string;
};

export function LoginForm({ next = "/account", initialError }: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"phone" | "email">("phone");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await requestPhoneOtp({ phone });
      if (result.ok) {
        router.push(
          `/verify?phone=${encodeURIComponent(result.data.phone)}&next=${encodeURIComponent(next)}`,
        );
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch {
      setError("Failed to send verification code. Please check your connection.");
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await requestEmailOtp({ email });
      if (result.ok) {
        router.push(
          `/verify?email=${encodeURIComponent(result.data.email)}&next=${encodeURIComponent(next)}`,
        );
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch {
      setError("Failed to send verification email. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-normal tracking-tight text-navy-900">
          Welcome to BooKanto
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Book trusted local services in your neighborhood
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

      {/* Tabs */}
      <div className="mb-6 flex rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            setTab("phone");
            setError(null);
          }}
          className={`flex-1 rounded-md py-2.5 text-center text-sm font-semibold transition-all ${
            tab === "phone"
              ? "bg-white text-navy-900 shadow-xs"
              : "text-slate-600 hover:text-navy-900"
          }`}
        >
          Phone Number
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("email");
            setError(null);
          }}
          className={`flex-1 rounded-md py-2.5 text-center text-sm font-semibold transition-all ${
            tab === "email"
              ? "bg-white text-navy-900 shadow-xs"
              : "text-slate-600 hover:text-navy-900"
          }`}
        >
          Email
        </button>
      </div>

      {/* Phone form */}
      {tab === "phone" ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone-input" className="mb-1.5 block text-sm font-medium text-navy-900">
              Philippine Mobile Number
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <span>🇵🇭</span>
                <span>+63</span>
              </span>
              <Input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="917 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-20 text-base"
                required
                disabled={loading}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              We&apos;ll text you a 6-digit verification code. No password needed.
            </p>
          </div>

          <Button
            type="submit"
            className="h-12 w-full bg-orange-500 font-semibold text-navy-900 hover:bg-orange-600"
            disabled={loading || !phone.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
                Sending code...
              </span>
            ) : (
              "Send verification code"
            )}
          </Button>
        </form>
      ) : (
        /* Email form */
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email-input" className="mb-1.5 block text-sm font-medium text-navy-900">
              Email address
            </label>
            <Input
              id="email-input"
              type="email"
              autoComplete="email"
              placeholder="juan.delacruz@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              We&apos;ll send a 6-digit login code and magic link to your email.
            </p>
          </div>

          <Button
            type="submit"
            className="h-12 w-full bg-orange-500 font-semibold text-navy-900 hover:bg-orange-600"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
                Sending link...
              </span>
            ) : (
              "Continue with Email"
            )}
          </Button>
        </form>
      )}

      {/* Divider */}
      <div className="relative my-6 text-center text-xs text-slate-500">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-card px-3 font-medium tracking-wider text-slate-500 uppercase">
          Or continue with
        </span>
      </div>

      {/* Social login buttons: Google and Facebook */}
      <SocialAuthButtons next={next} onError={setError} />

      <p className="mt-6 text-center text-xs text-slate-500">
        By continuing, you agree to BooKanto&apos;s{" "}
        <a href="/terms" className="text-orange-700 underline underline-offset-2">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-orange-700 underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
