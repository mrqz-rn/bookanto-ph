import { describe, expect, it } from "vitest";

import { CATEGORY_SERVICE_TEMPLATES, getCategoryTemplates } from "@/features/services/templates";

describe("category service templates", () => {
  it("provides templates for all key Philippine shop categories", () => {
    const expectedCategories = [
      "barbershop",
      "hair-salon",
      "nail-salon",
      "massage",
      "aircon-cleaning",
      "auto-repair",
      "car-wash",
      "laundry",
      "pet-grooming",
      "home-cleaning",
    ];

    for (const cat of expectedCategories) {
      const group = CATEGORY_SERVICE_TEMPLATES[cat];
      expect(group).toBeDefined();
      expect(group?.services.length).toBeGreaterThan(0);
    }
  });

  it("ensures each template has positive duration and valid booking types", () => {
    const allTemplates = getCategoryTemplates();
    for (const group of allTemplates) {
      for (const service of group.services) {
        expect(service.name).toBeTruthy();
        expect(service.durationMin).toBeGreaterThan(0);
        expect(["fixed", "starts_at", "quote"]).toContain(service.priceType);
        expect(["slot", "home", "quote", "queue"]).toContain(service.bookingType);

        if (service.priceType !== "quote") {
          expect(service.priceCentavos).toBeGreaterThan(0);
        }
      }
    }
  });

  it("filters templates by category slug", () => {
    const result = getCategoryTemplates("barbershop");
    expect(result).toHaveLength(1);
    expect(result[0]?.categorySlug).toBe("barbershop");
    expect(result[0]?.services.some((s) => s.name === "Standard Haircut")).toBe(true);
  });
});
