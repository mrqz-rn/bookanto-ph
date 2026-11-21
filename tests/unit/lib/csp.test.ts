import { describe, expect, it } from "vitest";

import { buildCsp } from "@/lib/csp";
import { DYNAMIC_ROUTES, matchesRoute, SIGNED_IN_ROUTES } from "@/lib/routes";

const supabaseUrl = "https://abc.supabase.co";

function directive(policy: string, name: string): string {
  return policy.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}

describe("buildCsp", () => {
  it("uses the nonce and strict-dynamic on dynamic pages", () => {
    const scriptSrc = directive(
      buildCsp({ nonce: "abc123", supabaseUrl, dev: false }),
      "script-src",
    );
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("allows inline scripts only on cacheable pages", () => {
    const scriptSrc = directive(buildCsp({ supabaseUrl, dev: false }), "script-src");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("nonce");
  });

  it("locks down framing, plugins and form targets", () => {
    const policy = buildCsp({ supabaseUrl, dev: false });
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("allows Supabase over HTTPS and realtime websockets", () => {
    const connectSrc = directive(buildCsp({ supabaseUrl, dev: false }), "connect-src");
    expect(connectSrc).toContain("https://abc.supabase.co");
    expect(connectSrc).toContain("wss://abc.supabase.co");
  });

  it("allows the open-source map tiles and place search", () => {
    const policy = buildCsp({ nonce: "abc123", supabaseUrl, dev: false });
    expect(directive(policy, "connect-src")).toContain("https://tiles.openfreemap.org");
    expect(directive(policy, "connect-src")).toContain("https://nominatim.openstreetmap.org");
    expect(directive(policy, "worker-src")).toContain("blob:");
  });

  it("relaxes only what local development needs", () => {
    const policy = buildCsp({ supabaseUrl: "http://127.0.0.1:54321", dev: true });
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "connect-src")).toContain("ws://127.0.0.1:54321");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});

describe("matchesRoute", () => {
  it("matches a route and its subpaths only", () => {
    expect(matchesRoute("/account", DYNAMIC_ROUTES)).toBe(true);
    expect(matchesRoute("/account/bookings", DYNAMIC_ROUTES)).toBe(true);
    expect(matchesRoute("/explore", DYNAMIC_ROUTES)).toBe(true);
    expect(matchesRoute("/explore", SIGNED_IN_ROUTES)).toBe(true);
    expect(matchesRoute("/accounting", DYNAMIC_ROUTES)).toBe(false);
    expect(matchesRoute("/", DYNAMIC_ROUTES)).toBe(false);
  });
});
