import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startTwoFactorSetupAction, verifyTwoFactorAction } from "@/features/auth/actions";
import { writeAudit } from "@/lib/audit";
import * as auth from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { hitRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  startTotpEnrollment: vi.fn(),
  verifyTotpCode: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ hitRateLimit: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));

const person = (platformRole: auth.CurrentUser["platformRole"]): auth.CurrentUser => ({
  id: randomUUID(),
  authId: "auth-1",
  name: "Founder",
  phone: null,
  email: "founder@example.com",
  platformRole,
  status: "active",
  memberships: [],
});

describe("admin two-factor actions", () => {
  const factorId = randomUUID();

  beforeEach(() => {
    vi.mocked(auth.requireUser).mockResolvedValue(person("super_admin"));
    vi.mocked(auth.getTwoFactorStatus).mockResolvedValue({ level: "aal1", factorId: null });
    vi.mocked(hitRateLimit).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("startTwoFactorSetupAction", () => {
    it("returns a QR code and key for an admin without an authenticator", async () => {
      const enrollment = { factorId, qrCode: "data:image/svg+xml;utf-8,<svg/>", secret: "ABC" };
      vi.mocked(auth.startTotpEnrollment).mockResolvedValue(enrollment);
      expect(await startTwoFactorSetupAction()).toEqual({ ok: true, data: enrollment });
    });

    it("is for admins only", async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(person("customer"));
      const res = await startTwoFactorSetupAction();
      expect(res).toMatchObject({ ok: false, code: "FORBIDDEN" });
      expect(auth.startTotpEnrollment).not.toHaveBeenCalled();
    });

    it("won't add a second authenticator over an existing one", async () => {
      vi.mocked(auth.getTwoFactorStatus).mockResolvedValue({ level: "aal1", factorId });
      expect(await startTwoFactorSetupAction()).toMatchObject({ ok: false, code: "CONFLICT" });
      expect(auth.startTotpEnrollment).not.toHaveBeenCalled();
    });
  });

  describe("verifyTwoFactorAction", () => {
    it("finishes setup and logs it", async () => {
      const res = await verifyTwoFactorAction({ factorId, code: "123456", next: "/admin/audit" });
      expect(res).toEqual({ ok: true, data: { next: "/admin/audit" } });
      expect(auth.verifyTotpCode).toHaveBeenCalledWith(factorId, "123456");
      expect(writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "admin.two_factor_enabled" }),
      );
    });

    it("logs each later admin sign-in", async () => {
      vi.mocked(auth.getTwoFactorStatus).mockResolvedValue({ level: "aal1", factorId });
      await verifyTwoFactorAction({ factorId, code: "123456" });
      expect(writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "admin.signed_in" }),
      );
    });

    it("only follows same-site paths afterwards", async () => {
      const res = await verifyTwoFactorAction({ factorId, code: "123456", next: "//evil.example" });
      expect(res).toEqual({ ok: true, data: { next: "/admin" } });
    });

    it("stops after too many tries", async () => {
      vi.mocked(hitRateLimit).mockResolvedValue(false);
      const res = await verifyTwoFactorAction({ factorId, code: "123456" });
      expect(res).toMatchObject({ ok: false, code: "RATE_LIMITED" });
      expect(auth.verifyTotpCode).not.toHaveBeenCalled();
    });

    it("passes on a wrong code without logging a sign-in", async () => {
      vi.mocked(auth.verifyTotpCode).mockRejectedValue(new AppError("VALIDATION", "Wrong code"));
      const res = await verifyTwoFactorAction({ factorId, code: "000000" });
      expect(res).toMatchObject({ ok: false, code: "VALIDATION" });
      expect(writeAudit).not.toHaveBeenCalled();
    });

    it("rejects codes that aren't 6 digits and non-admins", async () => {
      expect(await verifyTwoFactorAction({ factorId, code: "12ab56" })).toMatchObject({
        ok: false,
        code: "VALIDATION",
      });
      vi.mocked(auth.requireUser).mockResolvedValue(person("customer"));
      expect(await verifyTwoFactorAction({ factorId, code: "123456" })).toMatchObject({
        ok: false,
        code: "FORBIDDEN",
      });
      expect(auth.verifyTotpCode).not.toHaveBeenCalled();
    });
  });
});
