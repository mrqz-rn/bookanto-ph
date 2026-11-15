import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertCan,
  can,
  PERMISSIONS,
  type AuthzResource,
  type AuthzUser,
  type Permission,
} from "@/lib/authz";
import { AppError } from "@/lib/errors";

// The RBAC table from the development plan, row by row. Change a row here
// only when the plan changes, then make lib/authz.ts match.
//
//   yes       allowed on any record
//   no        never allowed
//   own       only bookings where the user is the customer
//   shop      any record in a shop where the user holds this role
//   assigned  only bookings in their shop that are assigned to them
//   staff     in their shop, and only when the target member is staff
//   dispute   only when the booking has an open dispute
type Expectation = "yes" | "no" | "own" | "shop" | "assigned" | "staff" | "dispute";

const ROLES = ["guest", "customer", "staff", "manager", "owner", "admin", "super_admin"] as const;
type Role = (typeof ROLES)[number];

const row = (
  ...cells: [
    Expectation,
    Expectation,
    Expectation,
    Expectation,
    Expectation,
    Expectation,
    Expectation,
  ]
) => Object.fromEntries(ROLES.map((role, i) => [role, cells[i]])) as Record<Role, Expectation>;

// prettier-ignore
//                                guest  customer  staff       manager  owner   admin      super_admin
const MATRIX: Record<Permission, Record<Role, Expectation>> = {
  "shop:read":                row("yes", "yes",    "yes",      "yes",   "yes",  "yes",     "yes"),
  "user:update_own":          row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "user:delete_own":          row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "address:manage_own":       row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "notification:read_own":    row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "notification:manage_own":  row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "booking:create":           row("no",  "yes",    "yes",      "yes",   "yes",  "no",      "no"),
  "booking:read_own":         row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "booking:cancel_own":       row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "booking:reschedule_own":   row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "booking:accept_quote":     row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "booking:pay":              row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "review:create":            row("no",  "own",    "own",      "own",   "own",  "no",      "no"),
  "shop:create":              row("no",  "yes",    "yes",      "yes",   "yes",  "no",      "no"),
  "shop:update":              row("no",  "no",     "no",       "shop",  "shop", "yes",     "yes"),
  "service:manage":           row("no",  "no",     "no",       "shop",  "shop", "no",      "no"),
  "booking:read":             row("no",  "no",     "assigned", "shop",  "shop", "yes",     "yes"),
  "booking:accept":           row("no",  "no",     "assigned", "shop",  "shop", "no",      "no"),
  "booking:decline":          row("no",  "no",     "assigned", "shop",  "shop", "no",      "no"),
  "booking:quote":            row("no",  "no",     "assigned", "shop",  "shop", "no",      "no"),
  "booking:complete":         row("no",  "no",     "assigned", "shop",  "shop", "no",      "no"),
  "booking:no_show":          row("no",  "no",     "assigned", "shop",  "shop", "no",      "no"),
  "booking:cancel":           row("no",  "no",     "assigned", "shop",  "shop", "no",      "no"),
  "booking:walk_in":          row("no",  "no",     "shop",     "shop",  "shop", "no",      "no"),
  "schedule:block":           row("no",  "no",     "shop",     "shop",  "shop", "no",      "no"),
  "message:send":             row("no",  "own",    "assigned", "shop",  "shop", "no",      "no"),
  "message:read":             row("no",  "own",    "assigned", "shop",  "shop", "dispute", "dispute"),
  "review:reply":             row("no",  "no",     "no",       "shop",  "shop", "no",      "no"),
  "shop_member:manage":       row("no",  "no",     "no",       "staff", "shop", "no",      "no"),
  "shop_document:upload":     row("no",  "no",     "no",       "no",    "shop", "no",      "no"),
  "shop_document:read":       row("no",  "no",     "no",       "no",    "shop", "yes",     "yes"),
  "shop:delete":              row("no",  "no",     "no",       "no",    "shop", "no",      "yes"),
  "shop:transfer":            row("no",  "no",     "no",       "no",    "shop", "no",      "yes"),
  "admin:shop.verify":        row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:shop.suspend":       row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:review.hide":        row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:report.resolve":     row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:user.suspend":       row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:category.manage":    row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:city.manage":        row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:announcement.manage":row("no",  "no",     "no",       "no",    "no",   "yes",     "yes"),
  "admin:admin.manage":       row("no",  "no",     "no",       "no",    "no",   "no",      "yes"),
  "admin:settings.manage":    row("no",  "no",     "no",       "no",    "no",   "no",      "yes"),
  "admin:audit.read":         row("no",  "no",     "no",       "no",    "no",   "no",      "yes"),
};

const ME = "user-me";
const SOMEONE = "user-someone";
const MY_SHOP = "shop-mine";
const OTHER_SHOP = "shop-other";

function actor(role: Role): AuthzUser | null {
  switch (role) {
    case "guest":
      return null;
    case "customer":
      return { id: ME, platformRole: "customer", status: "active", memberships: [] };
    case "staff":
    case "manager":
    case "owner":
      return {
        id: ME,
        platformRole: "customer",
        status: "active",
        memberships: [{ shopId: MY_SHOP, role }],
      };
    case "admin":
    case "super_admin":
      return { id: ME, platformRole: role, status: "active", memberships: [] };
  }
}

// A record that belongs to nobody the actor knows.
const foreign: AuthzResource = {
  shopId: OTHER_SHOP,
  customerId: SOMEONE,
  assignedStaffId: SOMEONE,
  memberRole: "manager",
  disputed: false,
};
// A record that ties the actor to it every way possible.
const everything: AuthzResource = {
  shopId: MY_SHOP,
  customerId: ME,
  assignedStaffId: ME,
  memberRole: "staff",
  disputed: true,
};
const inMyShop: AuthzResource = { ...foreign, shopId: MY_SHOP };

/** The resources that must be allowed and denied for each expectation. */
function scenarios(expectation: Expectation): Array<[allowed: boolean, AuthzResource, string]> {
  switch (expectation) {
    case "yes":
      return [[true, foreign, "a record that isn't theirs"]];
    case "no":
      return [
        [false, everything, "a record tied to them"],
        [false, foreign, "a record that isn't theirs"],
      ];
    case "own":
      return [
        [true, { ...foreign, customerId: ME }, "their own booking"],
        [false, foreign, "someone else's booking"],
      ];
    case "shop":
      return [
        [true, inMyShop, "a record in their shop"],
        [false, foreign, "a record in another shop"],
      ];
    case "assigned":
      return [
        [true, { ...inMyShop, assignedStaffId: ME }, "a booking assigned to them"],
        [false, inMyShop, "a booking in their shop assigned to someone else"],
        [false, { ...foreign, assignedStaffId: ME }, "a booking in another shop"],
      ];
    case "staff":
      return [
        [true, { ...inMyShop, memberRole: "staff" }, "a staff member in their shop"],
        [false, { ...inMyShop, memberRole: "manager" }, "a manager in their shop"],
        [false, { ...foreign, memberRole: "staff" }, "a staff member in another shop"],
      ];
    case "dispute":
      return [
        [true, { ...foreign, disputed: true }, "a disputed booking"],
        [false, foreign, "a booking without a dispute"],
      ];
  }
}

describe("permissions matrix", () => {
  it("covers every permission in lib/authz.ts", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...PERMISSIONS].sort());
  });

  for (const permission of PERMISSIONS) {
    describe(permission, () => {
      for (const role of ROLES) {
        for (const [allowed, resource, description] of scenarios(MATRIX[permission][role])) {
          it(`${allowed ? "allows" : "denies"} ${role} on ${description}`, () => {
            expect(can(actor(role), permission, resource)).toBe(allowed);
          });
        }
      }
    });
  }
});

describe("account state", () => {
  it("lets suspended users browse and nothing else", () => {
    const suspended: AuthzUser = {
      id: ME,
      platformRole: "customer",
      status: "suspended",
      memberships: [{ shopId: MY_SHOP, role: "owner" }],
    };
    for (const permission of PERMISSIONS) {
      expect(can(suspended, permission, everything)).toBe(permission === "shop:read");
    }
  });

  it("ignores shop memberships on admin accounts", () => {
    const admin: AuthzUser = {
      id: ME,
      platformRole: "admin",
      status: "active",
      memberships: [{ shopId: MY_SHOP, role: "owner" }],
    };
    expect(can(admin, "service:manage", inMyShop)).toBe(false);
    expect(can(admin, "booking:accept", everything)).toBe(false);
  });
});

describe("assertCan", () => {
  afterEach(() => vi.restoreAllMocks());

  const expectAppError = (fn: () => void, code: string) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      fn();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(code);
    }
  };

  it("passes when allowed", () => {
    expect(() => assertCan(actor("owner"), "service:manage", inMyShop)).not.toThrow();
  });

  it("throws UNAUTHENTICATED for guests", () => {
    expectAppError(() => assertCan(null, "booking:create"), "UNAUTHENTICATED");
  });

  it("throws FORBIDDEN, or NOT_FOUND when hiding the record", () => {
    expectAppError(() => assertCan(actor("customer"), "booking:read", foreign), "FORBIDDEN");
    expectAppError(
      () => assertCan(actor("customer"), "booking:read", foreign, { hideExistence: true }),
      "NOT_FOUND",
    );
  });
});
