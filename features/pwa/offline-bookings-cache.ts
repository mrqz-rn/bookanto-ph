import type { TodayDashboardData } from "@/features/bookings/constants";
import { BOOKANTO_LAST_SHOP_ID_KEY, BOOKANTO_TODAY_CACHE_PREFIX } from "./constants";

export type CachedTodaySchedule = {
  shopId: string;
  cachedAt: string;
  data: TodayDashboardData;
};

/**
 * Persists today's dashboard bookings and schedule to client storage
 * so shop owners can inspect appointments even when offline.
 */
export function saveTodayBookingsCache(shopId: string, data: TodayDashboardData): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    const payload: CachedTodaySchedule = {
      shopId,
      cachedAt: new Date().toISOString(),
      data,
    };
    window.localStorage.setItem(`${BOOKANTO_TODAY_CACHE_PREFIX}${shopId}`, JSON.stringify(payload));
    window.localStorage.setItem(BOOKANTO_LAST_SHOP_ID_KEY, shopId);
    return true;
  } catch {
    // Storage quota or private browsing restrictions
    return false;
  }
}

/**
 * Retrieves cached today's bookings. If shopId is omitted, falls back
 * to the most recently active shop on this device.
 */
export function getTodayBookingsCache(targetShopId?: string): CachedTodaySchedule | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const shopId = targetShopId || window.localStorage.getItem(BOOKANTO_LAST_SHOP_ID_KEY);
    if (!shopId) {
      return null;
    }

    const raw = window.localStorage.getItem(`${BOOKANTO_TODAY_CACHE_PREFIX}${shopId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedTodaySchedule;
    if (!parsed || !parsed.data || !Array.isArray(parsed.data.todayBookings)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears cached today's schedule for a specific shop.
 */
export function clearTodayBookingsCache(shopId: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(`${BOOKANTO_TODAY_CACHE_PREFIX}${shopId}`);
    if (window.localStorage.getItem(BOOKANTO_LAST_SHOP_ID_KEY) === shopId) {
      window.localStorage.removeItem(BOOKANTO_LAST_SHOP_ID_KEY);
    }
  } catch {
    // Ignore error
  }
}

/**
 * Formats ISO timestamp for user-facing cache notices
 * (e.g. "Showing schedule cached at 2:30 PM").
 */
export function formatCacheTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return "earlier today";
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  } catch {
    return "earlier today";
  }
}
