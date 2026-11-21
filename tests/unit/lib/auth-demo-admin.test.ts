import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, env: { ...actual.env, NODE_ENV: "production" } };
});

const { signInDemoAccount } = await import("@/lib/auth");
const { db } = await import("@/lib/db");

describe("sample super admin in production", () => {
  it("refuses to sign in as (or create) the sample super admin", async () => {
    const transaction = vi.spyOn(db, "transaction");
    await expect(signInDemoAccount("admin")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
