import { describe, expect, it } from "vitest";

import { formatPeso, formatPesoCompact, pesosToCentavos } from "@/lib/money";

describe("formatPesoCompact", () => {
  it("shortens large amounts", () => {
    expect(formatPesoCompact(95_000)).toBe("₱950");
    expect(formatPesoCompact(1_250_000)).toBe("₱12.5K");
    expect(formatPesoCompact(123_456_700)).toBe("₱1.2M");
    expect(formatPesoCompact(0)).toBe("₱0");
  });

  it("rejects fractional centavos", () => {
    expect(() => formatPesoCompact(1.5)).toThrow(RangeError);
  });
});

describe("formatPeso", () => {
  it("drops decimals for whole pesos", () => {
    expect(formatPeso(150_000)).toBe("₱1,500");
    expect(formatPeso(0)).toBe("₱0");
  });

  it("shows centavos when there are any", () => {
    expect(formatPeso(15_050)).toBe("₱150.50");
    expect(formatPeso(5)).toBe("₱0.05");
  });

  it("rejects fractional centavos", () => {
    expect(() => formatPeso(1.5)).toThrow(RangeError);
  });
});

describe("pesosToCentavos", () => {
  it("parses typed amounts", () => {
    expect(pesosToCentavos("1,250.5")).toBe(125_050);
    expect(pesosToCentavos("₱100")).toBe(10_000);
    expect(pesosToCentavos("99.99")).toBe(9_999);
  });

  it("avoids floating-point drift", () => {
    expect(pesosToCentavos(19.99)).toBe(1_999);
    expect(pesosToCentavos(0.1 + 0.2)).toBe(30);
  });

  it("rejects anything that isn't an amount", () => {
    for (const input of ["", "abc", "1.234", "1e3", "--5"]) {
      expect(() => pesosToCentavos(input)).toThrow(RangeError);
    }
  });
});
