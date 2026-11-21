import { describe, expect, it } from "vitest";

import {
  cadenceSuffix,
  durationLabel,
  extrasLabel,
  groupByCategory,
  menuSummary,
  packageSaving,
  parsePesos,
  servicePrice,
  type MenuService,
} from "@/features/services/menu";

function service(id: string, overrides: Partial<MenuService> = {}): MenuService {
  return {
    id,
    shopId: "shop",
    categoryId: null,
    categoryName: null,
    name: id,
    description: null,
    priceType: "fixed",
    priceCentavos: 10000,
    durationMin: 30,
    bookingType: "slot",
    capacity: 1,
    bufferMin: 0,
    active: true,
    sortOrder: 0,
    photos: [],
    addons: [],
    ...overrides,
  };
}

describe("durationLabel", () => {
  it.each([
    [15, "15 min"],
    [60, "1 hr"],
    [90, "1 hr 30 min"],
    [240, "4 hr"],
  ])("%i minutes reads %s", (minutes, label) => {
    expect(durationLabel(minutes)).toBe(label);
  });
});

describe("servicePrice", () => {
  it("shows a fixed price, a starting price and a quote", () => {
    expect(servicePrice("fixed", 35000)).toBe("₱350");
    expect(servicePrice("starts_at", 35000)).toBe("From ₱350");
    expect(servicePrice("quote", null)).toBe("By quote");
    expect(servicePrice("fixed", null)).toBe("By quote");
  });
});

describe("extrasLabel", () => {
  it("counts photos and add-ons, or says nothing", () => {
    const photo = { id: "p", path: "p.jpg", sortOrder: 0 };
    const addon = {
      id: "a",
      serviceId: "s",
      name: "Wash",
      description: null,
      priceCentavos: 0,
      durationMin: 0,
      active: true,
    };
    expect(extrasLabel({ photos: [], addons: [] })).toBeNull();
    expect(extrasLabel({ photos: [photo], addons: [] })).toBe("1 photo");
    expect(extrasLabel({ photos: [photo, photo], addons: [addon] })).toBe("2 photos, 1 add-on");
  });
});

describe("groupByCategory", () => {
  const categories = [
    { id: "nails", name: "Nail salon", slug: "nail-salon", icon: "hand" },
    { id: "hair", name: "Barbershop", slug: "barbershop", icon: "scissors" },
  ];

  it("follows the shop's category order and puts uncategorised services last", () => {
    const groups = groupByCategory(
      [
        service("fade", { categoryId: "hair" }),
        service("loose"),
        service("gel", { categoryId: "nails" }),
        service("trim", { categoryId: "hair" }),
      ],
      categories,
    );

    expect(groups.map((g) => [g.name, g.icon, g.services.map((s) => s.id)])).toEqual([
      ["Nail salon", "hand", ["gel"]],
      ["Barbershop", "scissors", ["fade", "trim"]],
      ["Other services", null, ["loose"]],
    ]);
  });

  it("keeps a service whose category the shop no longer lists under that category's name", () => {
    const groups = groupByCategory(
      [service("x", { categoryId: "spa", categoryName: "Spa" }), service("y")],
      categories,
    );
    expect(groups.map((g) => g.name)).toEqual(["Spa", "Other services"]);
  });
});

describe("menuSummary", () => {
  it("counts what customers see and what's hidden", () => {
    expect(menuSummary([])).toBe("Nothing on your menu yet.");
    expect(menuSummary([{ active: true }])).toBe("1 service on your menu.");
    expect(menuSummary([{ active: true }, { active: false }])).toBe(
      "2 services, 1 hidden from customers.",
    );
    expect(menuSummary([{ active: true }, { active: false }, { active: false }])).toBe(
      "3 services, 2 hidden from customers.",
    );
    expect(menuSummary([{ active: false }])).toBe("1 service, all hidden from customers.");
  });
});

describe("packageSaving", () => {
  it("gives a whole percent only when the package is cheaper", () => {
    expect(packageSaving(36000, 45000)).toBe(20);
    expect(packageSaving(45000, 45000)).toBeNull();
    expect(packageSaving(45000, null)).toBeNull();
    expect(packageSaving(44990, 45000)).toBeNull();
  });
});

describe("cadenceSuffix", () => {
  it("says what the price buys", () => {
    expect(cadenceSuffix("monthly")).toBe("a month");
    expect(cadenceSuffix("sessions_pack")).toBe("per pass");
  });
});

describe("parsePesos", () => {
  it("reads peso amounts as centavos and rejects the rest", () => {
    expect(parsePesos("350")).toBe(35000);
    expect(parsePesos("1,250.50")).toBe(125050);
    expect(parsePesos("₱99")).toBe(9900);
    expect(parsePesos("")).toBeNull();
    expect(parsePesos("abc")).toBeNull();
    expect(parsePesos("-5")).toBeNull();
  });
});
