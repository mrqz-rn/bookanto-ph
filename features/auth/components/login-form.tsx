"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Store, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestEmailOtp,
  requestPhoneOtp,
  signInDemoAccountAction,
  signInWithPasswordAction,
} from "@/features/auth/actions";
import { SAMPLE_ACCOUNTS, type SampleAccountRole } from "@/features/auth/constants";
import { SocialAuthButtons } from "./social-auth-buttons";

type LoginFormProps = {
  next?: string;
  initialError?: string;
};

export function LoginForm({ next = "/account", initialError }: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"phone" | "email">("phone");
  const [emailMode, setEmailMode] = React.useState<"password" | "otp">("password");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState<SampleAccountRole | null>(null);
  const [error, setError] = React.useState<string | null>(initialError ?? null);

  const isBusy = loading || demoLoading !== null;

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
      if (emailMode === "password") {
        const result = await signInWithPasswordAction({ email, password, next });
        if (result.ok) {
          router.push(result.data.next);
          router.refresh();
        } else {
          setError(result.message);
          setLoading(false);
        }
        return;
      }

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
      setError("Failed to sign in with email. Please check your connection.");
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (role: SampleAccountRole) => {
    setError(null);
    setDemoLoading(role);
    try {
      const result = await signInDemoAccountAction({ role, next });
      if (result.ok) {
        router.push(result.data.next);
        router.refresh();
      } else {
        setError(result.message);
        setDemoLoading(null);
      }
    } catch {
      setError("Failed to sign in to sample account. Please try again.");
      setDemoLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">
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
            className="h-12 w-full bg-primary font-semibold text-white hover:bg-primary/90"
            disabled={loading || !phone.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
              disabled={isBusy}
            />
          </div>

          {emailMode === "password" ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password-input" className="block text-sm font-medium text-navy-900">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("otp");
                    setError(null);
                  }}
                  className="text-xs font-medium text-green-700 hover:underline"
                >
                  Use 6-digit code instead
                </button>
              </div>
              <Input
                id="password-input"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isBusy}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                We&apos;ll send a 6-digit login code and magic link to your email.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEmailMode("password");
                  setError(null);
                }}
                className="shrink-0 text-xs font-medium text-green-700 hover:underline"
              >
                Use password
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full bg-primary font-semibold text-white hover:bg-primary/90"
            disabled={isBusy || !email.trim() || (emailMode === "password" && !password)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {emailMode === "password" ? "Signing in..." : "Sending link..."}
              </span>
            ) : emailMode === "password" ? (
              "Sign in with Email"
            ) : (
              "Send Login Code"
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

      {/* Sample Accounts Quick Sign-In */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="mb-2.5 text-xs font-semibold tracking-wider text-slate-600 uppercase">
          Sample Accounts (1-Click Demo)
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleDemoSignIn("store")}
            className="h-auto flex-col items-start gap-0.5 border-orange-200 bg-white px-3 py-2.5 text-left hover:bg-orange-50/60"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
              <Store className="size-3.5 text-orange-600" />
              {demoLoading === "store" ? "Signing in..." : "Store Owner"}
            </span>
            <span className="text-[11px] text-slate-500">{SAMPLE_ACCOUNTS.store.email}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleDemoSignIn("customer")}
            className="h-auto flex-col items-start gap-0.5 border-emerald-200 bg-white px-3 py-2.5 text-left hover:bg-emerald-50/60"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
              <User className="size-3.5 text-emerald-700" />
              {demoLoading === "customer" ? "Signing in..." : "Customer User"}
            </span>
            <span className="text-[11px] text-slate-500">{SAMPLE_ACCOUNTS.customer.email}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleDemoSignIn("admin")}
            className="col-span-1 h-auto flex-col items-start gap-0.5 border-purple-200 bg-white px-3 py-2.5 text-left hover:bg-purple-50/60 sm:col-span-2"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
              <Shield className="size-3.5 text-purple-700" />
              {demoLoading === "admin" ? "Signing in..." : "Super Admin"}
            </span>
            <span className="text-[11px] text-slate-500">{SAMPLE_ACCOUNTS.admin.email}</span>
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        By continuing, you agree to BooKanto&apos;s{" "}
        <Link href="/terms" className="text-green-700 underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-green-700 underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
