import { describe, expect, it } from "vitest";

import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  oauthSignInSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
} from "@/features/auth/schema";

describe("auth schemas", () => {
  describe("phoneOtpRequestSchema", () => {
    it("accepts valid Philippine mobile numbers and normalizes them", () => {
      const parsed = phoneOtpRequestSchema.parse({ phone: "0917 123 4567" });
      expect(parsed.phone).toBe("+639171234567");
    });

    it("rejects non-Philippine or invalid phone numbers", () => {
      expect(() => phoneOtpRequestSchema.parse({ phone: "12345" })).toThrow();
      expect(() => phoneOtpRequestSchema.parse({ phone: "+1234567890" })).toThrow();
    });

    it("rejects unknown extra properties", () => {
      expect(() => phoneOtpRequestSchema.parse({ phone: "09171234567", extra: true })).toThrow();
    });
  });

  describe("phoneOtpVerifySchema", () => {
    it("accepts valid 6-digit codes", () => {
      const parsed = phoneOtpVerifySchema.parse({
        phone: "+639171234567",
        code: "123456",
        next: "/account",
      });
      expect(parsed.code).toBe("123456");
      expect(parsed.phone).toBe("+639171234567");
      expect(parsed.next).toBe("/account");
    });

    it("rejects non-6-digit codes", () => {
      expect(() => phoneOtpVerifySchema.parse({ phone: "09171234567", code: "12345" })).toThrow();
      expect(() => phoneOtpVerifySchema.parse({ phone: "09171234567", code: "abcdef" })).toThrow();
    });
  });

  describe("emailOtpRequestSchema", () => {
    it("accepts valid email addresses", () => {
      const parsed = emailOtpRequestSchema.parse({ email: "user@example.com" });
      expect(parsed.email).toBe("user@example.com");
    });

    it("rejects invalid emails", () => {
      expect(() => emailOtpRequestSchema.parse({ email: "not-an-email" })).toThrow();
    });
  });

  describe("emailOtpVerifySchema", () => {
    it("accepts valid email and code", () => {
      const parsed = emailOtpVerifySchema.parse({
        email: "user@example.com",
        code: "654321",
      });
      expect(parsed.email).toBe("user@example.com");
      expect(parsed.code).toBe("654321");
      expect(parsed.next).toBe("/auth/continue");
    });
  });

  describe("oauthSignInSchema", () => {
    it("accepts supported OAuth providers", () => {
      expect(oauthSignInSchema.parse({ provider: "google" }).provider).toBe("google");
      expect(oauthSignInSchema.parse({ provider: "facebook" }).provider).toBe("facebook");
    });

    it("rejects unsupported providers", () => {
      expect(() => oauthSignInSchema.parse({ provider: "github" })).toThrow();
    });
  });
});
