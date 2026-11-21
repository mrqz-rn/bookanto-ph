"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestEmailOtp,
  requestPhoneOtp,
  signInWithPasswordAction,
} from "@/features/auth/actions";
import { DEFAULT_AUTH_REDIRECT, PHONE_AUTH_ENABLED } from "@/features/auth/constants";
import { SHOP_REGISTRATION_ROUTE } from "@/lib/home";

import { SocialAuthButtons } from "./social-auth-buttons";

type LoginFormProps = {
  next?: string;
  /** "shop" when the visitor came from shop registration: shop copy, code sign-in first. */
  intent?: "customer" | "shop";
  initialError?: string;
  /** A success message, e.g. after a password reset. */
  notice?: string;
};

export function LoginForm({
  next = DEFAULT_AUTH_REDIRECT,
  intent = "customer",
  initialError,
  notice,
}: LoginFormProps) {
  const router = useRouter();
  const isShopIntent = intent === "shop";
  const [tab, setTab] = React.useState<"phone" | "email">(PHONE_AUTH_ENABLED ? "phone" : "email");
  // A new shop owner has no password yet; the email code creates the account.
  const [emailMode, setEmailMode] = React.useState<"password" | "otp">(
    isShopIntent ? "otp" : "password",
  );
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);

  const isBusy = loading;

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

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        {isShopIntent ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <Store className="size-3.5" aria-hidden />
              For shops and service providers
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900">
              Register your shop
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Log in or create a free account with your email or Google. Next, you&apos;ll set up
              your shop in 5 steps.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">
              Welcome to BooKanto
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Book trusted local services in your neighborhood
            </p>
          </>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-danger/30 bg-red-50 p-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {notice && !error && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {notice}
        </div>
      )}

      {/* Tabs (hidden while phone auth is disabled) */}
      {PHONE_AUTH_ENABLED && (
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
      )}

      {/* Phone form */}
      {PHONE_AUTH_ENABLED && tab === "phone" ? (
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
              <div className="mt-1 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="inline-flex min-h-11 items-center text-sm font-medium text-green-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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

      {/* Social login buttons: Google (Facebook temporarily hidden) */}
      <SocialAuthButtons next={next} onError={setError} />

      {isShopIntent ? (
        <p className="mt-6 text-center text-sm text-slate-600">
          Just booking a service?{" "}
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center font-semibold text-green-700 hover:underline"
          >
            Log in as a customer
          </Link>
        </p>
      ) : (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-navy-900">
            Do you have a shop or are you a service provider?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Get bookings from customers nearby. Free during the pilot.
          </p>
          <Link
            href={SHOP_REGISTRATION_ROUTE}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
          >
            Register your shop with us
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}

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
