import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError, parseInput, runAction } from "@/lib/errors";

afterEach(() => vi.restoreAllMocks());

describe("runAction", () => {
  it("wraps the result", async () => {
    await expect(runAction(async () => 42)).resolves.toEqual({ ok: true, data: 42 });
  });

  it("returns AppErrors as friendly results", async () => {
    const result = await runAction(async () => {
      throw new AppError("CONFLICT");
    });
    expect(result).toEqual({ ok: false, code: "CONFLICT", message: expect.any(String) });
  });

  it("hides unexpected errors from the user", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runAction(async () => {
      throw new Error("connection refused at 10.0.0.5");
    });
    expect(result).toMatchObject({ ok: false, code: "INTERNAL" });
    expect(JSON.stringify(result)).not.toContain("10.0.0.5");
  });

  it("lets Next.js redirects through", async () => {
    await expect(runAction(async () => redirect("/login"))).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("parseInput", () => {
  const schema = z.strictObject({ name: z.string().min(1) });

  it("returns parsed data", () => {
    expect(parseInput(schema, { name: "Kuya Jun" })).toEqual({ name: "Kuya Jun" });
  });

  it("reports field errors", () => {
    try {
      parseInput(schema, { name: "" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION");
      expect((error as AppError).fieldErrors?.name).toHaveLength(1);
    }
  });

  it("rejects unknown fields", () => {
    expect(() => parseInput(schema, { name: "Kuya Jun", role: "admin" })).toThrow(AppError);
  });
});
