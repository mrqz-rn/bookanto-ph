"use client";

import * as React from "react";
import { CheckCircle2, WifiOff } from "lucide-react";

export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [showRestoredNotice, setShowRestoredNotice] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsOnline(window.navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 shadow-md sm:text-sm"
      >
        <WifiOff className="size-4 shrink-0 text-neutral-950" />
        <span>You are currently offline. Showing cached schedule and pages where available.</span>
      </div>
    );
  }

  if (showRestoredNotice) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 border-b border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md sm:text-sm"
      >
        <CheckCircle2 className="size-4 shrink-0 text-white" />
        <span>Back online! Reconnecting to live booking updates...</span>
      </div>
    );
  }

  return null;
}
