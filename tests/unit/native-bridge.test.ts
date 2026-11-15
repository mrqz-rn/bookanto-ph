// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getAppleAppSiteAssociation } from "@/app/.well-known/apple-app-site-association/route";
import { GET as getAssetLinks } from "@/app/.well-known/assetlinks.json/route";
import {
  callPhoneNumber,
  clearAppBadge,
  getAppPlatform,
  isNativeApp,
  isStandalonePwa,
  setAppBadge,
  shareContent,
  triggerHaptic,
} from "@/features/pwa/native-bridge";

describe("Native App Bridge and Universal Links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  });

  it("detects web platform by default", () => {
    expect(isNativeApp()).toBe(false);
    expect(isStandalonePwa()).toBe(false);
    expect(getAppPlatform()).toBe("web");
  });

  it("detects Capacitor native platform when available", () => {
    window.Capacitor = {
      isNativePlatform: () => true,
    };
    expect(isNativeApp()).toBe(true);
    expect(getAppPlatform()).toBe("native");
  });

  it("detects React Native WebView environment", () => {
    window.ReactNativeWebView = {
      postMessage: vi.fn(),
    };
    expect(isNativeApp()).toBe(true);
    expect(getAppPlatform()).toBe("native");
  });

  it("triggers haptics via Vibration API or Capacitor", () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, "vibrate", {
      configurable: true,
      value: vibrateMock,
    });

    const res = triggerHaptic("medium");
    expect(res).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(35);
  });

  it("handles app badges via navigator.setAppBadge", async () => {
    const setAppBadgeMock = vi.fn().mockResolvedValue(undefined);
    const clearAppBadgeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "setAppBadge", {
      configurable: true,
      value: setAppBadgeMock,
    });
    Object.defineProperty(window.navigator, "clearAppBadge", {
      configurable: true,
      value: clearAppBadgeMock,
    });

    await setAppBadge(3);
    expect(setAppBadgeMock).toHaveBeenCalledWith(3);

    await clearAppBadge();
    expect(clearAppBadgeMock).toHaveBeenCalled();
  });

  it("shares content via navigator.share", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: shareMock,
    });

    const res = await shareContent({ title: "BooKanto", url: "https://bookanto.ph" });
    expect(res).toBe(true);
    expect(shareMock).toHaveBeenCalledWith({
      title: "BooKanto",
      url: "https://bookanto.ph",
    });
  });

  it("invokes cellular phone call with cleaned phone number", () => {
    const originalHref = window.location.href;
    delete (window as unknown as { location: unknown }).location;
    // @ts-expect-error test mock
    window.location = { href: "" };

    callPhoneNumber("0917-123-4567");
    expect(window.location.href).toBe("tel:09171234567");

    // @ts-expect-error test restore
    window.location = { href: originalHref } as unknown as Location;
  });

  it("serves Android Digital Asset Links for verified app links", async () => {
    const res = await getAssetLinks();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].target.package_name).toBe("ph.bookanto.app");
  });

  it("serves Apple App Site Association for iOS Universal Links", async () => {
    const res = await getAppleAppSiteAssociation();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.applinks).toBeDefined();
    expect(data.applinks.details[0].appIDs).toContain("TEAMID1234.ph.bookanto.app");
  });
});
