import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Download, Share, Smartphone, WifiOff, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PwaInstallButton } from "@/features/pwa/components/pwa-install-button";
import { PWA_BENEFITS } from "@/features/pwa/constants";

export const metadata: Metadata = {
  title: "Get BooKanto App | PWA & Native Mobile Apps",
  description:
    "Install BooKanto on your Android, iPhone, or computer. Experience instant bookings, offline schedule caching, and real-time push alerts.",
};

export default function AppLandingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6 sm:py-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-green-50 via-white to-emerald-50/50 p-6 shadow-sm sm:p-12 lg:p-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
            <Smartphone className="size-3.5" />
            <span>Progressive Web App & Native Pilot</span>
          </span>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Book local services faster with the BooKanto App
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
            No massive downloads, no slow app updates. Install BooKanto directly from your browser
            to your home screen in seconds, or join our native pilot on Android & iOS.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PwaInstallButton
              size="lg"
              className="w-full bg-green-600 px-6 font-bold text-white shadow-md hover:bg-green-500 sm:w-auto"
            />
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/explore">
                Explore Services
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-3 text-[11px] text-neutral-500 sm:text-xs">
            Free to install • Uses less than 2 MB • Works on iOS, Android, and Desktop
          </p>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section aria-labelledby="features-heading" className="space-y-6">
        <div className="text-center">
          <h2
            id="features-heading"
            className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl"
          >
            Designed for Filipino clients and shop owners
          </h2>
          <p className="mt-2 text-xs text-neutral-600 sm:text-sm">
            Engineered from day one for speed, spotty connections, and battery efficiency.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PWA_BENEFITS.map((benefit, idx) => {
            const Icon = idx === 0 ? Zap : idx === 1 ? WifiOff : idx === 2 ? Bell : Smartphone;
            return (
              <div
                key={benefit.title}
                className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs"
              >
                <div>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-bold text-neutral-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Installation Instructions */}
      <section aria-labelledby="install-guide-heading" className="space-y-6">
        <div className="text-center">
          <h2
            id="install-guide-heading"
            className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl"
          >
            How to Install on Any Device
          </h2>
          <p className="mt-2 text-xs text-neutral-600 sm:text-sm">
            Quick 3-step installation guides without going through third-party app stores.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* iOS Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-neutral-900">
              <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold">
                iOS
              </span>
              <h3 className="font-display text-base font-bold">iPhone & iPad</h3>
            </div>
            <ol className="mt-4 space-y-3 text-xs text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  1
                </span>
                <span>
                  Open <strong className="font-semibold text-neutral-900">bookanto.ph</strong> in
                  Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  2
                </span>
                <span>
                  Tap the <Share className="inline size-3.5 text-blue-600" /> Share button in the
                  Safari bottom bar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  3
                </span>
                <span>
                  Select{" "}
                  <strong className="font-semibold text-neutral-900">
                    &quot;Add to Home Screen&quot;
                  </strong>{" "}
                  and tap Add.
                </span>
              </li>
            </ol>
          </div>

          {/* Android Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-neutral-900">
              <span className="flex size-8 items-center justify-center rounded-lg bg-green-100 text-xs font-bold text-green-800">
                APK
              </span>
              <h3 className="font-display text-base font-bold">Android (Chrome)</h3>
            </div>
            <ol className="mt-4 space-y-3 text-xs text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  1
                </span>
                <span>
                  Open <strong className="font-semibold text-neutral-900">bookanto.ph</strong> in
                  Chrome.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  2
                </span>
                <span>
                  Tap the{" "}
                  <strong className="font-semibold text-neutral-900">
                    &quot;Install App&quot;
                  </strong>{" "}
                  button or menu (⋮).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  3
                </span>
                <span>
                  Confirm{" "}
                  <strong className="font-semibold text-neutral-900">&quot;Install&quot;</strong> to
                  place BooKanto on your home screen.
                </span>
              </li>
            </ol>
          </div>

          {/* Desktop Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-neutral-900">
              <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold">
                PC
              </span>
              <h3 className="font-display text-base font-bold">Windows & Mac</h3>
            </div>
            <ol className="mt-4 space-y-3 text-xs text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  1
                </span>
                <span>Visit BooKanto using Google Chrome or Microsoft Edge.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  2
                </span>
                <span>
                  Click the <Download className="inline size-3.5 text-neutral-700" /> icon in your
                  address bar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                  3
                </span>
                <span>Click Install to launch BooKanto as a dedicated standalone desktop app.</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Native App Store Pilot Notice */}
      <section className="rounded-3xl border border-neutral-200 bg-neutral-900 p-6 text-white shadow-sm sm:p-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-bold text-green-400 uppercase">
              Phase 3 • In Development
            </span>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Native App Store Releases
            </h2>
            <p className="max-w-xl text-xs text-neutral-300 sm:text-sm">
              We are packaging BooKanto for the Google Play Store and Apple App Store for pilot
              shops. Sign up today and get priority access to store binaries as soon as they go
              live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-green-600 font-bold text-white hover:bg-green-500"
            >
              <Link href="/dashboard/setup">
                Register Your Shop
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
