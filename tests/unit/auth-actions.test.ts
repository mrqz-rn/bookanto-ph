import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getOAuthUrl,
  requestEmailOtp,
  requestPhoneOtp,
  signInDemoAccountAction,
  signInWithPasswordAction,
  verifyEmailOtpAction,
  verifyPhoneOtpAction,
} from "@/features/auth/actions";
import { AppError } from "@/lib/errors";
import * as authAdapter from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  sendOtp: vi.fn().mockResolvedValue(undefined),
  verifyOtp: vi.fn().mockResolvedValue({ authId: "user-123" }),
  sendEmailOtp: vi.fn().mockResolvedValue(undefined),
  verifyEmailOtp: vi.fn().mockResolvedValue({ authId: "user-456" }),
  getOAuthSignInUrl: vi.fn().mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?..."),
  signInWithPassword: vi.fn().mockResolvedValue({ authId: "user-789" }),
  signInDemoAccount: vi.fn().mockResolvedValue({ authId: "demo-store", defaultNext: "/dashboard" }),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe("auth server actions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("requestPhoneOtp", () => {
    it("normalizes phone and requests OTP", async () => {
      const result = await requestPhoneOtp({ phone: "0917 123 4567" });
      expect(result).toEqual({ ok: true, data: { phone: "+639171234567" } });
      expect(authAdapter.sendOtp).toHaveBeenCalledWith("+639171234567", undefined);
    });

    it("rejects invalid phone numbers", async () => {
      const result = await requestPhoneOtp({ phone: "123" });
      expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    });
  });

  describe("verifyPhoneOtpAction", () => {
    it("verifies phone OTP and returns authId", async () => {
      const result = await verifyPhoneOtpAction({
        phone: "0917 123 4567",
        code: "123456",
        next: "/account",
      });
      expect(result).toEqual({
        ok: true,
        data: { authId: "user-123", next: "/account" },
      });
      expect(authAdapter.verifyOtp).toHaveBeenCalledWith("+639171234567", "123456");
    });
  });

  describe("requestEmailOtp", () => {
    it("requests email OTP", async () => {
      const result = await requestEmailOtp({ email: "user@example.com" });
      expect(result).toEqual({ ok: true, data: { email: "user@example.com" } });
      expect(authAdapter.sendEmailOtp).toHaveBeenCalledWith("user@example.com", undefined);
    });

    it("rejects invalid email addresses", async () => {
      const result = await requestEmailOtp({ email: "not-an-email" });
      expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    });
  });

  describe("verifyEmailOtpAction", () => {
    it("verifies email OTP and returns authId", async () => {
      const result = await verifyEmailOtpAction({
        email: "user@example.com",
        code: "654321",
        next: "/account",
      });
      expect(result).toEqual({
        ok: true,
        data: { authId: "user-456", next: "/account" },
      });
      expect(authAdapter.verifyEmailOtp).toHaveBeenCalledWith("user@example.com", "654321");
    });
  });

  describe("getOAuthUrl", () => {
    it("returns OAuth URL for Google", async () => {
      const result = await getOAuthUrl({ provider: "google", next: "/account" });
      expect(result.ok).toBe(true);
      expect(authAdapter.getOAuthSignInUrl).toHaveBeenCalledWith("google", "/account");
    });

    it("passes origin to getOAuthSignInUrl when provided", async () => {
      const result = await getOAuthUrl({
        provider: "google",
        next: "/account",
        origin: "http://localhost:3002",
      });
      expect(result.ok).toBe(true);
      expect(authAdapter.getOAuthSignInUrl).toHaveBeenCalledWith(
        "google",
        "/account",
        "http://localhost:3002",
      );
    });

    it("returns OAuth URL for Facebook", async () => {
      const result = await getOAuthUrl({ provider: "facebook", next: "/account" });
      expect(result.ok).toBe(true);
      expect(authAdapter.getOAuthSignInUrl).toHaveBeenCalledWith("facebook", "/account");
    });

    it("returns validation error when OAuth provider is not enabled", async () => {
      vi.mocked(authAdapter.getOAuthSignInUrl).mockRejectedValueOnce(
        new AppError("VALIDATION", "Google sign-in is not enabled in Supabase Auth yet."),
      );
      const result = await getOAuthUrl({ provider: "google", next: "/account" });
      expect(result).toEqual({
        ok: false,
        code: "VALIDATION",
        message: "Google sign-in is not enabled in Supabase Auth yet.",
        fieldErrors: undefined,
      });
    });
  });

  describe("signInWithPasswordAction", () => {
    it("signs in with email and password", async () => {
      const result = await signInWithPasswordAction({
        email: "store@bookanto.ph",
        password: "DemoStore123!",
        next: "/dashboard",
      });
      expect(result).toEqual({
        ok: true,
        data: { authId: "user-789", next: "/dashboard" },
      });
      expect(authAdapter.signInWithPassword).toHaveBeenCalledWith(
        "store@bookanto.ph",
        "DemoStore123!",
      );
    });
  });

  describe("signInDemoAccountAction", () => {
    it("signs in with sample store account and uses defaultNext", async () => {
      const result = await signInDemoAccountAction({ role: "store" });
      expect(result).toEqual({
        ok: true,
        data: { authId: "demo-store", next: "/dashboard" },
      });
      expect(authAdapter.signInDemoAccount).toHaveBeenCalledWith("store");
    });
  });
});
