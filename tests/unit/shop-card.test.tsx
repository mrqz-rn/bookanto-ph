import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { priceLabel } from "@/components/shared/price-tag";
import { Rating } from "@/components/shared/rating";
import { ShopCard, type ShopCardData } from "@/components/shared/shop-card";

const shop: ShopCardData = {
  id: "shop-1",
  slug: "kuya-juns-barbershop-marikina",
  name: "Kuya Jun's Barbershop",
  categoryName: "Barbershop",
  categoryIcon: "scissors",
  place: "Concepcion Uno, Marikina",
  ratingAvg: 4.75,
  ratingCount: 12,
  fromPriceCentavos: 15_000,
  photoUrl: null,
  verified: true,
  distanceM: null,
};

describe("priceLabel", () => {
  it("labels each price type", () => {
    expect(priceLabel(15_000, "fixed")).toBe("₱150");
    expect(priceLabel(15_050, "starts_at")).toBe("From ₱150.50");
    expect(priceLabel(null, "quote")).toBe("Get a quote");
    expect(priceLabel(null, "fixed")).toBe("Get a quote");
  });
});

describe("Rating", () => {
  it("reads as a sentence to screen readers", () => {
    const html = renderToStaticMarkup(<Rating average={4.75} count={12} />);
    expect(html).toContain("Rated 4.8 out of 5 from 12 reviews");
  });

  it("marks shops without reviews as new", () => {
    expect(renderToStaticMarkup(<Rating average={0} count={0} />)).toContain(">New<");
  });
});

describe("ShopCard", () => {
  it("links to the shop page and shows its details", () => {
    const html = renderToStaticMarkup(<ShopCard shop={shop} />);
    expect(html).toContain('href="/shop/kuya-juns-barbershop-marikina"');
    expect(html).toContain("Barbershop · Concepcion Uno, Marikina");
    expect(html).toContain("From ₱150");
    expect(html).toContain("Verified");
    expect(html).not.toContain("away");
  });

  it("shows distance when sorted by it", () => {
    const html = renderToStaticMarkup(<ShopCard shop={{ ...shop, distanceM: 1_240 }} />);
    expect(html).toContain("1.2 km away");
  });
});
