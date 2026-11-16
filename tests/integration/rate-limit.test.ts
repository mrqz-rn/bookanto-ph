import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => import("./pglite-db"));

const { hitRateLimit } = await import("@/lib/rate-limit");

describe("hitRateLimit against real Postgres", () => {
  it("allows up to the limit in a window, then refuses", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await hitRateLimit("test:ip-1", 3, 60));
    expect(results).toEqual([true, true, true, false]);
  });

  it("counts each key separately", async () => {
    await hitRateLimit("test:ip-2", 1, 60);
    expect(await hitRateLimit("test:ip-2", 1, 60)).toBe(false);
    expect(await hitRateLimit("test:ip-3", 1, 60)).toBe(true);
  });

  it("allows the request when the check itself fails", async () => {
    const { db } = await import("./pglite-db");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db, "execute").mockRejectedValueOnce(new Error("connection lost"));
    expect(await hitRateLimit("test:ip-4", 1, 60)).toBe(true);
  });
});
