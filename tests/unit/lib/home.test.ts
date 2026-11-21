import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  homePathFor,
  isShopSetupPath,
  isStoreAccount,
  resolvePostLoginPath,
  SHOP_REGISTRATION_ROUTE,
  SHOP_SETUP_ROUTE,
} from "@/lib/home";

const store = {
  platformRole: "customer" as const,
  memberships: [{ shopId: "shop-1", role: "owner" as const }],
};
const customer = { platformRole: "customer" as const, memberships: [] };
const admin = { platformRole: "admin" as const, memberships: [] };

describe("account homes", () => {
  it("classifies store accounts by active shop membership", () => {
    expect(isStoreAccount(store)).toBe(true);
    expect(isStoreAccount(customer)).toBe(false);
    expect(isStoreAccount(admin)).toBe(false);
  });

  it("sends each account to its home", () => {
    expect(homePathFor(store)).toBe("/dashboard");
    expect(homePathFor(customer)).toBe("/explore");
    expect(homePathFor(admin)).toBe("/admin");
  });

  it("keeps store accounts out of the marketplace", () => {
    expect(canAccessPath(store, "/explore")).toBe(false);
    expect(canAccessPath(store, "/search")).toBe(false);
    expect(canAccessPath(store, "/dashboard/calendar")).toBe(true);
  });

  it("keeps user accounts out of the dashboard, except shop setup", () => {
    expect(canAccessPath(customer, "/dashboard")).toBe(false);
    expect(canAccessPath(customer, "/dashboard/bookings/1")).toBe(false);
    expect(canAccessPath(customer, "/dashboard/setup")).toBe(true);
    expect(canAccessPath(customer, "/explore")).toBe(true);
  });

  it("resolves the post-login destination", () => {
    expect(resolvePostLoginPath(store, undefined)).toBe("/dashboard");
    expect(resolvePostLoginPath(store, "/auth/continue")).toBe("/dashboard");
    expect(resolvePostLoginPath(store, "/explore")).toBe("/dashboard");
    expect(resolvePostLoginPath(customer, "/dashboard?tab=1")).toBe("/explore");
    expect(resolvePostLoginPath(customer, "/account/bookings")).toBe("/account/bookings");
    expect(resolvePostLoginPath(customer, "//evil.example")).toBe("/explore");
    expect(resolvePostLoginPath(admin, "/admin/users")).toBe("/admin/users");
  });
});

describe("shop registration", () => {
  it("recognises a login that leads into the onboarding wizard", () => {
    expect(isShopSetupPath(SHOP_SETUP_ROUTE)).toBe(true);
    expect(isShopSetupPath("/dashboard/setup?step=2")).toBe(true);
    expect(isShopSetupPath("/dashboard")).toBe(false);
    expect(isShopSetupPath("/dashboard/setup-other")).toBe(false);
    expect(isShopSetupPath(undefined)).toBe(false);
  });

  it("lets a customer account continue to the wizard after login", () => {
    expect(resolvePostLoginPath(customer, SHOP_SETUP_ROUTE)).toBe(SHOP_SETUP_ROUTE);
    expect(canAccessPath(customer, SHOP_REGISTRATION_ROUTE)).toBe(true);
  });
});
