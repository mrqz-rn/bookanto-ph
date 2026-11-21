import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

describe("Web App Manifest", () => {
  it("provides correct name, description and theme configuration", () => {
    const data = manifest();
    expect(data.name).toBe(`${SITE_NAME} - ${SITE_TAGLINE}`);
    expect(data.short_name).toBe(SITE_NAME);
    expect(data.description).toBe(SITE_DESCRIPTION);
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    expect(data.scope).toBe("/");
    expect(data.theme_color).toBe("#16a34a");
  });

  it("includes valid high-resolution standard and maskable icons", () => {
    const data = manifest();
    expect(data.icons).toBeDefined();
    expect(data.icons!.length).toBeGreaterThanOrEqual(2);

    const has192 = data.icons!.some((i) => i.sizes === "192x192");
    const has512 = data.icons!.some((i) => i.sizes === "512x512");
    const hasMaskable = data.icons!.some((i) => i.purpose === "maskable");

    expect(has192).toBe(true);
    expect(has512).toBe(true);
    expect(hasMaskable).toBe(true);
  });

  it("includes essential navigation shortcuts for quick access", () => {
    const data = manifest();
    expect(data.shortcuts).toBeDefined();
    expect(data.shortcuts!.length).toBeGreaterThanOrEqual(3);

    const urls = data.shortcuts!.map((s) => s.url);
    expect(urls).toContain("/explore");
    expect(urls).toContain("/dashboard");
    expect(urls).toContain("/account/bookings");
  });

  it("declares Philippine locale and categories", () => {
    const data = manifest();
    expect(data.lang).toBe("en-PH");
    expect(data.categories).toContain("lifestyle");
    expect(data.categories).toContain("business");
  });
});
