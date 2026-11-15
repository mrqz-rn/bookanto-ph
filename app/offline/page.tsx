import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { OfflineTodayBookings } from "@/features/pwa/components/offline-today-bookings";

export const metadata: Metadata = {
  title: "Offline | BooKanto",
  description: "You are currently offline. View your cached schedule and appointments.",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      {/* Offline App Header */}
      <header className="border-b border-neutral-200 bg-white py-4 shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
            <WifiOff className="size-3.5 text-amber-700" />
            <span>Offline Shell</span>
          </div>
        </div>
      </header>

      {/* Main Offline Content */}
      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Hero Banner */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <WifiOff className="size-7" />
              </div>

              <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
                Walang Koneksyon (You&apos;re Offline)
              </h1>

              <p className="mt-2 max-w-lg text-xs leading-relaxed text-neutral-600 sm:text-sm">
                No internet connection detected. But don&apos;t worry—BooKanto keeps your
                today&apos;s schedule cached right on your device so your shop can keep running
                smoothly.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  asChild
                  className="bg-green-600 font-bold text-white hover:bg-green-500"
                >
                  <a href="/">
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Retry Connection
                  </a>
                </Button>

                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-1.5 size-3.5" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Today's Offline Schedule Section */}
          <section aria-labelledby="offline-schedule-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="offline-schedule-heading"
                className="font-display text-lg font-bold text-neutral-900 sm:text-xl"
              >
                Today&apos;s Cached Schedule
              </h2>
              <span className="text-xs text-neutral-500">Saved locally on this device</span>
            </div>

            <OfflineTodayBookings />
          </section>

          {/* Offline helpful tips */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-xs text-neutral-600">
            <h3 className="font-bold text-neutral-900">
              Tips for Philippine shop owners during network drops:
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                Customer phone numbers in the schedule can be dialed via regular cellular calls
                without data.
              </li>
              <li>
                Once your mobile data or Wi-Fi reconnects, any new bookings from clients will
                automatically sync.
              </li>
              <li>
                Install BooKanto to your home screen for instant 1-tap offline access every day.
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
