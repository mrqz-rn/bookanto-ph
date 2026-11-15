"use client";

import * as React from "react";
import { PWA_DISMISSED_KEY } from "./constants";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PwaInstallState = {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isDismissed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable" | "ios-guide">;
  dismissPrompt: (durationDays?: number) => void;
  resetDismiss: () => void;
};

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // 1. Detect standalone mode
    const isStandaloneMode =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(isStandaloneMode));

    if (isStandaloneMode) {
      setIsInstalled(true);
    }

    // 2. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isSafari =
      ua.includes("safari") &&
      !ua.includes("chrome") &&
      !ua.includes("crios") &&
      !ua.includes("fxios");

    if (isIosDevice && isSafari && !isStandaloneMode) {
      setIsIOS(true);
    }

    // 3. Check dismiss cooldown
    try {
      const dismissedUntil = window.localStorage.getItem(PWA_DISMISSED_KEY);
      if (dismissedUntil) {
        const expiry = Number(dismissedUntil);
        if (!Number.isNaN(expiry) && Date.now() < expiry) {
          setIsDismissed(true);
        } else {
          window.localStorage.removeItem(PWA_DISMISSED_KEY);
        }
      }
    } catch {
      // Ignore localStorage error
    }

    // 4. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    // 5. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
        return choice.outcome;
      } catch {
        return "unavailable";
      }
    }

    if (isIOS) {
      return "ios-guide";
    }

    return "unavailable";
  }, [deferredPrompt, isIOS]);

  const dismissPrompt = React.useCallback((durationDays = 7) => {
    setIsDismissed(true);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const expiry = Date.now() + durationDays * 24 * 60 * 60 * 1000;
        window.localStorage.setItem(PWA_DISMISSED_KEY, String(expiry));
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  const resetDismiss = React.useCallback(() => {
    setIsDismissed(false);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(PWA_DISMISSED_KEY);
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  const canInstall = !isInstalled && !isStandalone && (deferredPrompt !== null || isIOS);

  return {
    canInstall,
    isInstalled,
    isStandalone,
    isIOS,
    isDismissed,
    promptInstall,
    dismissPrompt,
    resetDismiss,
  };
}
