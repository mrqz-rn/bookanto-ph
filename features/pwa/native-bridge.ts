import type { AppPlatform, HapticType } from "./constants";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      toNative?: (plugin: string, method: string, data?: unknown) => void;
    };
    ReactNativeWebView?: {
      postMessage?: (message: string) => void;
    };
  }
}

/**
 * Detects if the current environment is running inside a native wrapper
 * (Capacitor or React Native WebView wrapper).
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function") {
    return window.Capacitor.isNativePlatform();
  }

  if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === "function") {
    return true;
  }

  if (window.navigator.userAgent.includes("BooKantoNative")) {
    return true;
  }

  return false;
}

/**
 * Determines whether running as an installed standalone PWA.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const isMediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return (
    Boolean(isMediaStandalone) ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Detects the client platform.
 */
export function getAppPlatform(): AppPlatform {
  if (typeof window === "undefined") {
    return "web";
  }

  if (isNativeApp()) {
    return "native";
  }

  if (isStandalonePwa()) {
    return "pwa";
  }

  const ua = window.navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) {
    return "android";
  }
  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }

  return "web";
}

/**
 * Triggers native haptic feedback. Uses the browser Vibration API
 * when running as a web app or PWA, or Capacitor bridge if native.
 */
export function triggerHaptic(type: HapticType = "light"): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // 1. Capacitor bridge
  if (window.Capacitor?.toNative) {
    try {
      window.Capacitor.toNative("Haptics", "impact", { style: type.toUpperCase() });
      return true;
    } catch {
      // Fall through to vibration API
    }
  }

  // 2. Vibration API
  if (typeof window.navigator.vibrate === "function") {
    try {
      switch (type) {
        case "light":
          return window.navigator.vibrate(15);
        case "medium":
          return window.navigator.vibrate(35);
        case "heavy":
          return window.navigator.vibrate(60);
        case "success":
          return window.navigator.vibrate([20, 50, 30]);
        case "warning":
          return window.navigator.vibrate([40, 60, 40]);
        case "error":
          return window.navigator.vibrate([50, 40, 50, 40, 50]);
        default:
          return window.navigator.vibrate(20);
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Native or Web Share API.
 */
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (typeof window.navigator.share === "function") {
    try {
      await window.navigator.share(options);
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return false;
      }
    }
  }

  // Fallback: Copy URL to clipboard
  if (options.url && typeof window.navigator.clipboard?.writeText === "function") {
    try {
      await window.navigator.clipboard.writeText(options.url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Sets the badge count on the app icon (supported in PWA & native).
 */
export async function setAppBadge(count: number): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as unknown as {
    setAppBadge?: (count: number) => Promise<void>;
  };

  if (typeof nav.setAppBadge === "function") {
    try {
      await nav.setAppBadge(count);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Clears the app icon badge.
 */
export async function clearAppBadge(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as unknown as {
    clearAppBadge?: () => Promise<void>;
  };

  if (typeof nav.clearAppBadge === "function") {
    try {
      await nav.clearAppBadge();
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Opens standard cellular dialer with given phone number.
 */
export function callPhoneNumber(phone: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned) {
    window.location.href = `tel:${cleaned}`;
  }
}
