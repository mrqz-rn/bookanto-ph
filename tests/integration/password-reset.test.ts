import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Password reset against real SQL: link creation, the 10-minute expiry, the
// one-time claim, and a newer link replacing an older one.

vi.mock("@/lib/db", () => import("./pglite-db"));
const auth = vi.hoisted(() => ({
  setUserPassword: vi.fn().mockResolvedValue(undefined),
  signOutEverywhere: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/auth", () => auth);
const mail = vi.hoisted(() => ({
  sendAccountEmail: vi.fn().mockResolvedValue({ success: true }),
  escapeHtml: (v: string) => v.replace(/</g, "&lt;"),
}));
vi.mock("@/lib/notify", () => mail);
vi.mock("@/lib/request", () => ({ getClientIp: async () => "203.0.113.9" }));
// after() needs a request; run the callback straight away instead.
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

const { db } = await import("./pglite-db");
const s = await import("@/lib/db/schema");
const { requestPasswordResetAction, resetPasswordAction } = await import("@/features/auth/actions");
const { getResetLinkState } = await import("@/features/auth/queries");

const userId = randomUUID();
const authId = randomUUID();
const email = `reset-${userId.slice(0, 8)}@example.com`;

await db.insert(s.users).values({ id: userId, authId, email, name: "Maria" });

/** The token from the last reset email sent. */
function lastLinkToken(): string {
  const call = mail.sendAccountEmail.mock.calls.at(-1)?.[0] as { text: string } | undefined;
  const match = call?.text.match(/reset-password\?token=([A-Za-z0-9_-]{43})/);
  if (!match?.[1]) throw new Error("no reset link sent");
  return match[1];
}

async function requestLink(address = email): Promise<string> {
  // Each test gets a fresh rate-limit window.
  await db.execute(sql`delete from rate_limit_hits`);
  const res = await requestPasswordResetAction({ email: address });
  expect(res).toEqual({ ok: true, data: { sent: true } });
  return lastLinkToken();
}

const reset = (token: string, password = "new-password-1") =>
  resetPasswordAction({ token, password, confirmPassword: password });

describe("password reset links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emails a link that works once, then signs out every session", async () => {
    const token = await requestLink(email.toUpperCase());
    const sent = mail.sendAccountEmail.mock.calls[0]?.[0] as { to: string; subject: string };
    expect(sent.to).toBe(email);
    expect(sent.subject).toMatch(/Reset your BooKanto password/);
    expect(await getResetLinkState(token)).toBe("valid");

    expect(await reset(token)).toEqual({ ok: true, data: { done: true } });
    expect(auth.setUserPassword).toHaveBeenCalledWith(authId, "new-password-1");
    expect(auth.signOutEverywhere).toHaveBeenCalledWith(authId);
    expect(mail.sendAccountEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ subject: "Your BooKanto password was changed" }),
    );

    // Second use fails, and the page says why.
    const again = await reset(token);
    expect(again).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(await getResetLinkState(token)).toBe("used");
    expect(auth.setUserPassword).toHaveBeenCalledTimes(1);
  });

  it("stores only a hash of the token, expiring 10 minutes out", async () => {
    const token = await requestLink();
    const rows = await db
      .select()
      .from(s.passwordResetTokens)
      .where(eq(s.passwordResetTokens.userId, userId));
    const row = rows.find((r) => r.usedAt === null);
    expect(row?.tokenHash).not.toContain(token);
    const minutes = (row!.expiresAt.getTime() - row!.createdAt.getTime()) / 60_000;
    expect(minutes).toBeCloseTo(10, 1);
  });

  it("refuses a link after 10 minutes", async () => {
    const token = await requestLink();
    await db.execute(
      sql`update password_reset_tokens set expires_at = now() - interval '1 second' where user_id = ${userId} and used_at is null`,
    );
    expect(await getResetLinkState(token)).toBe("expired");
    expect(await reset(token)).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(auth.setUserPassword).not.toHaveBeenCalled();
  });

  it("lets only one of two simultaneous submits through", async () => {
    const token = await requestLink();
    const results = await Promise.all([reset(token), reset(token)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(auth.setUserPassword).toHaveBeenCalledTimes(1);
  });

  it("replaces an older unused link with a newer one", async () => {
    const first = await requestLink();
    const second = await requestLink();
    expect(await getResetLinkState(first)).toBe("invalid");
    expect(await getResetLinkState(second)).toBe("valid");
  });

  it("gives the link back when the new password is refused", async () => {
    const token = await requestLink();
    const { AppError } = await import("@/lib/errors");
    auth.setUserPassword.mockRejectedValueOnce(
      new AppError("VALIDATION", "Choose a stronger password."),
    );
    expect(await reset(token)).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(await getResetLinkState(token)).toBe("valid");
  });

  it("answers the same for an unknown email and sends nothing", async () => {
    const res = await requestPasswordResetAction({ email: "nobody@example.com" });
    expect(res).toEqual({ ok: true, data: { sent: true } });
    expect(mail.sendAccountEmail).not.toHaveBeenCalled();
  });

  it("limits requests per email address", async () => {
    await db.execute(sql`delete from rate_limit_hits`);
    for (let i = 0; i < 3; i++) await requestPasswordResetAction({ email });
    expect(await requestPasswordResetAction({ email })).toMatchObject({
      ok: false,
      code: "RATE_LIMITED",
    });
  });

  it("checks password length and that both entries match", async () => {
    const token = await requestLink();
    expect(
      await resetPasswordAction({ token, password: "short", confirmPassword: "short" }),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(
      await resetPasswordAction({ token, password: "long-enough-1", confirmPassword: "other-1" }),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(await getResetLinkState(token)).toBe("valid");
  });
});
