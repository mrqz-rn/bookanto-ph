import { describe, expect, it, vi } from "vitest";
import React from "react";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock database and queries
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/features/shops/queries", () => ({
  getPublicShopBySlug: vi.fn().mockResolvedValue({
    shop: {
      id: "shop-123",
      slug: "kuya-juns-barbershop-marikina",
      name: "Kuya Jun's Barbershop",
      description: "Barbershop in Concepcion Uno, Marikina.",
      address: "192 Mabini St., Concepcion Uno, Marikina",
      phone: "+639190000001",
      status: "active",
      verifiedAt: new Date(),
      ratingAvg: 0,
      ratingCount: 0,
      cityName: "Marikina",
      barangayName: "Concepcion Uno",
    },
    categories: [{ categoryId: "cat-1", name: "Barbershop", slug: "barbershop", icon: "scissors" }],
    hours: [],
    photos: [],
    services: [
      {
        id: "svc-1",
        name: "Haircut",
        description: null,
        priceType: "fixed",
        priceCentavos: 17000,
        durationMin: 30,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 0,
        active: true,
        sortOrder: 0,
        coverPhotoUrl: "https://example.com/photo.png",
      },
    ],
  }),
}));

vi.mock("@/features/reviews/queries", () => ({
  getShopReviewStats: vi.fn().mockResolvedValue({
    ratingAvg: 0,
    ratingCount: 0,
    recommendPercentage: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    highlights: [],
    photosCount: 0,
    showcasePhotos: [],
  }),
  getShopReviews: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock("@/features/search/queries", () => ({
  getSimilarShops: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

function findEventHandlersOnNativeElements(node: unknown, path = ""): string[] {
  const issues: string[] = [];
  if (!node || typeof node !== "object") return issues;

  if (React.isValidElement(node)) {
    const typeName = typeof node.type === "string" ? node.type : node.type?.name || "Component";
    const isNative = typeof node.type === "string";
    const props = node.props as Record<string, unknown>;
    if (isNative && props) {
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith("on") && typeof value === "function") {
          issues.push(`Native element <${typeName}> has event handler ${key} at ${path}`);
        }
      }
    }
    if (props && props.children) {
      const children = React.Children.toArray(props.children as React.ReactNode);
      for (let i = 0; i < children.length; i++) {
        issues.push(...findEventHandlersOnNativeElements(children[i], `${path}/${typeName}[${i}]`));
      }
    }
  } else if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      issues.push(...findEventHandlersOnNativeElements(node[i], `${path}[${i}]`));
    }
  }
  return issues;
}

describe("PublicShopPage Server Component", () => {
  it("does not pass event handlers to native elements in Server Components", async () => {
    const PublicShopPage = (await import("@/app/(public)/shop/[slug]/page")).default;
    const jsx = await PublicShopPage({
      params: Promise.resolve({ slug: "kuya-juns-barbershop-marikina" }),
    });

    const issues = findEventHandlersOnNativeElements(jsx);
    expect(issues).toEqual([]);
  });
});
