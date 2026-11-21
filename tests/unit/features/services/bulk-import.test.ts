import { describe, expect, it } from "vitest";

import {
  generateSampleCsvTemplate,
  parseServiceCsv,
  splitCsvLine,
} from "@/features/services/bulk-import";

describe("bulk import utility", () => {
  it("splits csv lines handling quoted commas properly", () => {
    const line = 'Haircut,fixed,"150.00",30,slot,"Cut, wash, and style"';
    const cols = splitCsvLine(line);
    expect(cols).toEqual(["Haircut", "fixed", "150.00", "30", "slot", "Cut, wash, and style"]);
  });

  it("parses valid csv rows with various price types and amounts", () => {
    const csv = `Name,Price Type,Price,Duration,Booking Type,Capacity
Men's Haircut,fixed,150,30,slot,1
Hair Coloring,starts_at,₱1200,120,slot,2
Deep Diagnostics,quote,,60,quote,1`;

    const result = parseServiceCsv(csv);
    expect(result.totalRows).toBe(3);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(3);

    expect(result.valid[0]).toMatchObject({
      name: "Men's Haircut",
      priceType: "fixed",
      priceCentavos: 15000,
      durationMin: 30,
      bookingType: "slot",
      capacity: 1,
    });

    expect(result.valid[1]).toMatchObject({
      name: "Hair Coloring",
      priceType: "starts_at",
      priceCentavos: 120000,
      durationMin: 120,
      bookingType: "slot",
      capacity: 2,
    });

    expect(result.valid[2]).toMatchObject({
      name: "Deep Diagnostics",
      priceType: "quote",
      priceCentavos: null,
      durationMin: 60,
      bookingType: "quote",
      capacity: 1,
    });
  });

  it("identifies row errors when required values are missing or invalid", () => {
    const csv = `Name,Price Type,Price,Duration,Booking Type
,fixed,150,30,slot
Valid Service,fixed,,30,slot
Bad Duration,fixed,100,0,slot`;

    const result = parseServiceCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(3);

    expect(result.invalid[0]?.errors).toContain("Service name is required (min 2 characters).");
    expect(result.invalid[1]?.errors).toContain(
      "Price is required for fixed and starts-at services.",
    );
    expect(result.invalid[2]?.errors).toContain("Duration must be between 5 and 1440 minutes.");
  });

  it("generates sample csv template with headers", () => {
    const tpl = generateSampleCsvTemplate();
    expect(tpl).toContain("Name,Price Type,Price (₱),Duration (mins),Booking Type");
    expect(tpl).toContain("Standard Haircut");
  });
});
