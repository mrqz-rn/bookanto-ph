import type { BookingType, MembershipCadence, PriceType } from "@/lib/db/schema/enums";
import { formatPeso, pesosToCentavos } from "@/lib/money";

// The shapes the Services & prices screens work with, and the pure helpers
// that turn them into labels. Browser-safe: no Zod, no database.

export type ServicePhoto = { id: string; path: string; sortOrder: number };

export type ServiceAddon = {
  id: string;
  serviceId: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  durationMin: number;
  active: boolean;
};

export type MenuService = {
  id: string;
  shopId: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCentavos: number | null;
  durationMin: number;
  bookingType: BookingType;
  capacity: number;
  bufferMin: number;
  active: boolean;
  sortOrder: number;
  photos: ServicePhoto[];
  addons: ServiceAddon[];
};

export type MenuPackage = {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  originalPriceCentavos: number | null;
  active: boolean;
  items: Array<{
    id: string;
    packageId: string;
    serviceId: string;
    serviceName: string;
    servicePriceCentavos: number | null;
    durationMin: number;
    quantity: number;
  }>;
};

export type MenuMembership = {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  cadence: MembershipCadence;
  sessionCredits: number | null;
  validityDays: number | null;
  perks: string | null;
  active: boolean;
};

export type MenuCategory = { id: string; name: string; slug: string; icon: string | null };

/** "45 min", "1 hr", "1 hr 30 min". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** What the shop sees for a price: "₱350", "From ₱350" or "By quote". */
export function servicePrice(priceType: PriceType, centavos: number | null): string {
  if (priceType === "quote" || centavos === null) return "By quote";
  return priceType === "starts_at" ? `From ${formatPeso(centavos)}` : formatPeso(centavos);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "2 photos, 1 add-on", or null when the service has neither. */
export function extrasLabel(service: Pick<MenuService, "photos" | "addons">): string | null {
  const parts = [];
  if (service.photos.length > 0) parts.push(plural(service.photos.length, "photo"));
  if (service.addons.length > 0) parts.push(plural(service.addons.length, "add-on"));
  return parts.length > 0 ? parts.join(", ") : null;
}

export type MenuGroup = {
  key: string;
  name: string;
  icon: string | null;
  services: MenuService[];
};

/**
 * Services by category, in the order the shop's categories come in, then
 * "Other services" for the ones without a category. Inside a group the
 * services keep their own order.
 */
export function groupByCategory(services: MenuService[], categories: MenuCategory[]): MenuGroup[] {
  const known = new Map(categories.map((c, index) => [c.id, { category: c, index }]));
  const groups = new Map<string, { group: MenuGroup; order: number }>();

  for (const service of services) {
    const match = service.categoryId ? known.get(service.categoryId) : undefined;
    const key = match ? match.category.id : (service.categoryId ?? "other");
    let entry = groups.get(key);
    if (!entry) {
      entry = {
        group: {
          key,
          name: match?.category.name ?? service.categoryName ?? "Other services",
          icon: match?.category.icon ?? null,
          services: [],
        },
        order: match ? match.index : service.categoryName ? categories.length : Infinity,
      };
      groups.set(key, entry);
    }
    entry.group.services.push(service);
  }

  return [...groups.values()].sort((a, b) => a.order - b.order).map((entry) => entry.group);
}

/** The line under the page title: "8 services, 2 of them hidden from customers." */
export function menuSummary(services: Array<Pick<MenuService, "active">>): string {
  if (services.length === 0) return "Nothing on your menu yet.";
  const hidden = services.filter((s) => !s.active).length;
  if (hidden === 0) return `${plural(services.length, "service")} on your menu.`;
  return `${plural(services.length, "service")}, ${hidden === services.length ? "all" : hidden} hidden from customers.`;
}

/** Whole-number percent off, or null when the package isn't cheaper. */
export function packageSaving(
  priceCentavos: number,
  originalCentavos: number | null,
): number | null {
  if (originalCentavos === null || originalCentavos <= priceCentavos) return null;
  const percent = Math.round(((originalCentavos - priceCentavos) / originalCentavos) * 100);
  return percent > 0 ? percent : null;
}

/** "a month", "per pass": what the price buys. */
export function cadenceSuffix(cadence: MembershipCadence): string {
  switch (cadence) {
    case "weekly":
      return "a week";
    case "monthly":
      return "a month";
    case "quarterly":
      return "every 3 months";
    case "yearly":
      return "a year";
    case "sessions_pack":
      return "per pass";
  }
}

/** A typed peso amount ("350", "1,250.50") as centavos, or null when it isn't one. */
export function parsePesos(text: string): number | null {
  if (text.trim() === "") return null;
  try {
    const centavos = pesosToCentavos(text);
    return centavos >= 0 ? centavos : null;
  } catch {
    return null;
  }
}
