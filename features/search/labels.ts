// Wording for category and city pages. Browser-safe and pure.

import { formatPeso } from "@/lib/money";
import { SITE_NAME } from "@/lib/seo";

/** Last words that take a plain "s" in a heading: "Barbershops in Marikina". */
const COUNTABLE = new Set([
  "barbershop",
  "shop",
  "salon",
  "studio",
  "clinic",
  "gym",
  "center",
  "spa",
]);

/**
 * A category name as a heading for many shops: "Barbershops", "Hair salons",
 * "Car washes". Names that describe a service ("Aircon cleaning") stay as
 * they are.
 */
export function pluralCategory(name: string): string {
  const words = name.trim().split(" ");
  const last = (words.at(-1) ?? "").toLowerCase();
  if (last === "wash") return `${name}es`;
  if (last === "laundry") return `${name} shops`;
  // "Massage and spa" is a pair of services, not a kind of shop.
  if (COUNTABLE.has(last) && !words.includes("and")) return `${name}s`;
  return name;
}

/** "Barbershops in Concepcion Uno, Marikina" */
export function listingHeading(category: string, place: string | null): string {
  const plural = pluralCategory(category);
  return place ? `${plural} in ${place}` : `${plural} near you`;
}

/** "₱100" or "₱100 to ₱1,500"; null when no shop lists a price. */
export function priceRangeLabel(
  minCentavos: number | null,
  maxCentavos: number | null,
): string | null {
  if (minCentavos === null) return null;
  if (maxCentavos === null || maxCentavos === minCentavos) return formatPeso(minCentavos);
  return `${formatPeso(minCentavos)} to ${formatPeso(maxCentavos)}`;
}

const TITLE_LIMIT = 60;

/**
 * A page title under 60 characters, brand included, such as
 * "Barbershops in Marikina, from ₱100 | BooKanto". The price goes first when
 * it doesn't fit, then the brand. Use with `title: { absolute }`.
 */
export function listingTitle(heading: string, minCentavos: number | null): string {
  const brand = ` | ${SITE_NAME}`;
  if (minCentavos !== null) {
    const withPrice = `${heading}, from ${formatPeso(minCentavos)}${brand}`;
    if (withPrice.length <= TITLE_LIMIT) return withPrice;
  }
  const plain = `${heading}${brand}`;
  return plain.length <= TITLE_LIMIT ? plain : heading.slice(0, TITLE_LIMIT);
}

/** A meta description under 155 characters. */
export function listingDescription(
  heading: string,
  shopCount: number,
  minCentavos: number | null,
): string {
  const count = shopCount === 1 ? "1 shop" : `${shopCount} shops`;
  const price = minCentavos !== null ? `, from ${formatPeso(minCentavos)}` : "";
  const text = `${heading}: compare ${count}${price}. See prices, reviews and hours, then book online for free on ${SITE_NAME}.`;
  return text.length <= 155
    ? text
    : `${heading}: compare prices and reviews, then book online for free.`;
}

export type Faq = { question: string; answer: string };

/** Questions shown (and marked up) on a category-and-place page. */
export function listingFaqs(input: {
  category: string;
  place: string | null;
  shopCount: number;
  minCentavos: number | null;
  maxCentavos: number | null;
  homeService: boolean;
}): Faq[] {
  const { category, place, shopCount, minCentavos, maxCentavos, homeService } = input;
  const what = pluralCategory(category).toLowerCase();
  const where = place ? ` in ${place}` : "";
  const range = priceRangeLabel(minCentavos, maxCentavos);
  const faqs: Faq[] = [];

  if (range) {
    faqs.push({
      question: `How much do ${what}${where} cost?`,
      answer:
        minCentavos === maxCentavos || maxCentavos === null
          ? `Prices on ${SITE_NAME} for ${what}${where} start at ${range}. Each shop sets its own prices, shown on its page.`
          : `Starting prices on ${SITE_NAME} for ${what}${where} range from ${range}, depending on the shop and the service. Each shop lists its prices on its page.`,
    });
  }
  faqs.push({
    question: `How do I book ${what}${where}?`,
    answer: `Pick a shop, choose a service and a time, and send your booking. The shop confirms by text. Booking on ${SITE_NAME} is free.`,
  });
  faqs.push({
    question: "Do I need to pay online?",
    answer: "No. You pay the shop directly, the same way you would as a walk-in.",
  });
  if (homeService) {
    faqs.push({
      question: `Can I book a home service${where}?`,
      answer: `Yes. Shops that visit your home are marked “Home service”. You give your address when you book, and the shop sees it only after accepting.`,
    });
  }
  if (shopCount > 0) {
    faqs.push({
      question: `How many ${what}${where} are on ${SITE_NAME}?`,
      answer: `${shopCount === 1 ? "1 shop is" : `${shopCount} shops are`} listed right now, and more join every week.`,
    });
  }
  return faqs;
}
