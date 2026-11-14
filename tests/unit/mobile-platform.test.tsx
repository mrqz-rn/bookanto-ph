import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MobilePlatform } from "@/features/marketing/components/sections";

describe("MobilePlatform section", () => {
  it("renders the section with heading and anchor", () => {
    const html = renderToStaticMarkup(<MobilePlatform />);
    expect(html).toContain('id="mobile"');
    expect(html).toContain("Mobile platform coming soon for Play Store and App store");
    expect(html).toContain("Mobile Platform");
  });

  it("renders both Google Play and App Store coming soon badges", () => {
    const html = renderToStaticMarkup(<MobilePlatform />);
    expect(html).toContain("Google Play");
    expect(html).toContain("App Store");
    expect(html).toContain("GET IT ON");
    expect(html).toContain("Download on the");
    expect(html).toContain("Coming soon");
  });

  it("renders feature highlights and call to action", () => {
    const html = renderToStaticMarkup(<MobilePlatform />);
    expect(html).toContain("Instant push notifications");
    expect(html).toContain("One-tap appointment management");
    expect(html).toContain("Optimized for Philippine networks");
    expect(html).toContain('href="#contact"');
    expect(html).toContain("Get notified on launch");
  });
});
