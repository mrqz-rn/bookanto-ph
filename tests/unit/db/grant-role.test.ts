import { describe, expect, it } from "vitest";

import { parseArgs } from "../../../db/grant-role";

describe("admin:grant arguments", () => {
  it("defaults to super_admin and normalises the email", () => {
    expect(parseArgs(["  Founder@Example.com "])).toEqual({
      email: "founder@example.com",
      role: "super_admin",
    });
  });

  it("takes --role before or after the email", () => {
    expect(parseArgs(["--role", "admin", "ops@example.com"]).role).toBe("admin");
    expect(parseArgs(["ops@example.com", "--role", "customer"]).role).toBe("customer");
  });

  it("refuses unknown roles, missing emails and extra arguments", () => {
    expect(() => parseArgs(["a@example.com", "--role", "owner"])).toThrow(/--role/);
    expect(() => parseArgs([])).toThrow(/Usage/);
    expect(() => parseArgs(["a@example.com", "b@example.com"])).toThrow(/Usage/);
  });
});
