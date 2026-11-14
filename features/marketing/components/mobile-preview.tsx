import { Bell, Calendar, Sparkles } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/shared/logo";

import { AppleIcon, GooglePlayIcon } from "./store-icons";

/** A decorative mockup of the mobile app experience on iOS and Android. */
export function MobilePreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm py-4 select-none">
      {/* Phone container */}
      <div className="relative mx-auto w-[280px] overflow-hidden rounded-[2.5rem] border-[10px] border-navy-900 bg-white shadow-2xl">
        {/* Top speaker notch */}
        <div className="flex justify-center pt-2">
          <div className="h-4 w-28 rounded-full bg-navy-900" />
        </div>

        {/* Screen content */}
        <div className="flex flex-col gap-3.5 p-4 pt-2">
          {/* App Header */}
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-1.5">
              <LogoMark className="h-6" />
              <Wordmark className="text-base" />
            </div>
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-green-700">
              <span className="size-1.5 rounded-full bg-green-600" />
              Mobile App
            </span>
          </div>

          {/* Incoming Booking Notification Card */}
          <div className="rounded-xl border border-green-200 bg-green-50/80 p-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-navy-900">
                <Bell className="size-3.5 fill-current" />
              </span>
              <div className="flex flex-col text-left">
                <p className="text-xs font-bold text-navy-900">New Booking Request</p>
                <p className="text-[11px] text-slate-600">Haircut &amp; Hot Towel · ₱250</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-green-800">
                  <Calendar className="size-3" />
                  Today, 3:30 PM (Jun M.)
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <span className="flex-1 rounded-md bg-green-600 py-1 text-center text-[11px] font-semibold text-navy-900">
                Accept
              </span>
              <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-[11px] font-medium text-slate-700">
                Details
              </span>
            </div>
          </div>

          {/* Quick Schedule Peek */}
          <div className="flex flex-col gap-1.5 rounded-xl border bg-slate-50/80 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-navy-900">
              <span>Today&apos;s Schedule</span>
              <span className="text-[10px] text-slate-500">6 appointments</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {[
                { time: "1:00 PM", name: "Alvin C.", status: "Done" },
                { time: "2:00 PM", name: "Rico T.", status: "In progress" },
                { time: "3:30 PM", name: "Jun M.", status: "Pending" },
              ].map((item) => (
                <div
                  key={item.time}
                  className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px] shadow-2xs"
                >
                  <span className="font-semibold text-navy-900">{item.time}</span>
                  <span className="text-slate-600">{item.name}</span>
                  <span
                    className={
                      item.status === "Done"
                        ? "font-medium text-slate-500"
                        : item.status === "In progress"
                          ? "font-semibold text-green-700"
                          : "font-semibold text-amber-600"
                    }
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stores Coming Soon Banner inside app */}
          <div className="rounded-xl bg-navy-900 p-2.5 text-center text-white">
            <p className="flex items-center justify-center gap-1 text-[11px] font-bold text-yellow-400">
              <Sparkles className="size-3 text-yellow-400" />
              Play Store &amp; App Store
            </p>
            <p className="mt-0.5 text-[10px] text-white/80">Coming soon to Android &amp; iOS</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-center pb-2">
          <div className="h-1 w-24 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* Floating Badges */}
      <div className="absolute top-16 -left-2 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xs sm:flex">
        <GooglePlayIcon className="size-5 shrink-0" />
        <div className="text-left text-xs">
          <p className="font-bold text-navy-900">Google Play</p>
          <p className="text-[10px] font-semibold text-green-700">Coming soon</p>
        </div>
      </div>

      <div className="absolute -right-2 bottom-12 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xs sm:flex">
        <AppleIcon className="size-5 shrink-0 text-navy-900" />
        <div className="text-left text-xs">
          <p className="font-bold text-navy-900">App Store</p>
          <p className="text-[10px] font-semibold text-green-700">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
