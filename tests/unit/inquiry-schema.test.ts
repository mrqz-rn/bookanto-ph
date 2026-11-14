import { describe, expect, it } from "vitest";
import { z } from "zod";

import { inquiryInput } from "@/features/marketing/schema";

const valid = {
  kind: "shop",
  name: "Jun Reyes",
  email: "",
  phone: "0917 123 4567",
  businessName: "Kuya Jun's Barbershop",
  city: "Marikina",
  message: "I'd like to join the pilot with my barbershop.",
};

const fieldErrors = (input: unknown) => {
  const result = inquiryInput.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
};

describe("inquiry input", () => {
  it("normalizes the phone and turns blank fields into null", () => {
    const parsed = inquiryInput.parse({ ...valid, businessName: "  ", city: "" });
    expect(parsed).toMatchObject({
      phone: "+639171234567",
      email: null,
      businessName: null,
      city: null,
    });
  });

  it("lowercases email", () => {
    expect(inquiryInput.parse({ ...valid, email: "Jun@Example.PH" }).email).toBe("jun@example.ph");
  });

  it("needs an email or a phone number", () => {
    expect(fieldErrors({ ...valid, phone: "" }).email).toEqual([
      "Add an email or a mobile number so we can reply",
    ]);
  });

  it("rejects numbers that aren't Philippine mobiles", () => {
    expect(fieldErrors({ ...valid, phone: "12345" }).phone).toHaveLength(1);
  });

  it("rejects bad emails, short messages and unknown kinds", () => {
    const errors = fieldErrors({ ...valid, email: "jun@", message: "hi", kind: "reseller" });
    expect(errors.email).toHaveLength(1);
    expect(errors.message).toHaveLength(1);
    expect(errors.kind).toHaveLength(1);
  });

  it("rejects fields it doesn't know", () => {
    expect(inquiryInput.safeParse({ ...valid, status: "closed" }).success).toBe(false);
  });
});
