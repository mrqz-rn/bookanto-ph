import { describe, expect, it } from "vitest";

import { formatPhone, isValidPhilippinePhone, normalizePhone } from "@/lib/phone";

describe("phone normalization and validation", () => {
  it("normalizes standard Philippine mobile formats to E.164", () => {
    expect(normalizePhone("09171234567")).toBe("+639171234567");
    expect(normalizePhone("0917-123-4567")).toBe("+639171234567");
    expect(normalizePhone("(0917) 123 4567")).toBe("+639171234567");
    expect(normalizePhone("9171234567")).toBe("+639171234567");
    expect(normalizePhone("639171234567")).toBe("+639171234567");
    expect(normalizePhone("+639171234567")).toBe("+639171234567");
  });

  it("validates Philippine mobile numbers", () => {
    expect(isValidPhilippinePhone("+639171234567")).toBe(true);
    expect(isValidPhilippinePhone("+639981234567")).toBe(true);
    expect(isValidPhilippinePhone("+63917123456")).toBe(false); // too short
    expect(isValidPhilippinePhone("+638171234567")).toBe(false); // not starting with 9
    expect(isValidPhilippinePhone("09171234567")).toBe(false); // not normalized
  });

  it("formats phone for readable display", () => {
    expect(formatPhone("+639171234567")).toBe("+63 917 123 4567");
    expect(formatPhone("09171234567")).toBe("+63 917 123 4567");
    expect(formatPhone(null)).toBe("");
  });
});
