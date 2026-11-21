import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const { toAppError } = await import("@/lib/auth");

afterEach(() => vi.restoreAllMocks());

describe("toAppError for Supabase's 429s", () => {
  it("says how long to wait when one address asks again too soon", () => {
    const error = toAppError({
      status: 429,
      code: "over_email_send_rate_limit",
      message: "For security purposes, you can only request this after 42 seconds.",
    });
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toBe(
      "We just sent you a code. Wait 42 seconds before asking for a new one.",
    );
  });

  it("names the hourly email cap and offers the other ways in", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = toAppError({
      status: 429,
      code: "over_email_send_rate_limit",
      message: "email rate limit exceeded",
    });
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toMatch(/too many sign-in emails this hour/);
    expect(error.message).toMatch(/password or Google/);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Authentication > Rate Limits"));
  });

  it("keeps the general message for other limits", () => {
    const error = toAppError({
      status: 429,
      code: "over_request_rate_limit",
      message: "Request rate limit reached",
    });
    expect(error.message).toBe("Too many tries. Please wait a few minutes and try again.");
  });
});
