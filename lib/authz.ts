import type { PlatformRole, ShopRole, UserStatus } from "@/lib/db/schema/enums";
import { AppError } from "@/lib/errors";

// Roles and permissions from the RBAC table in the development plan.
// tests/authz/permissions-matrix.test.ts checks every row against every role;
// update both together.

export type AuthzUser = {
  id: string;
  platformRole: PlatformRole;
  status: UserStatus;
  /** Active shop memberships only. */
  memberships: ReadonlyArray<{ shopId: string; role: ShopRole }>;
};

/** The record being acted on. Ownership is checked in the same call as the role. */
export type AuthzResource = {
  shopId?: string;
  customerId?: string | null;
  assignedStaffId?: string | null;
  /** For shop_member:manage, the role being invited or removed. */
  memberRole?: ShopRole;
  /** For message:read, whether the booking has an open dispute. */
  disputed?: boolean;
};

type Rule = (user: AuthzUser, resource: AuthzResource) => boolean;

const isCustomer = (user: AuthzUser) => user.platformRole === "customer";
const isAdmin = (user: AuthzUser) =>
  user.platformRole === "admin" || user.platformRole === "super_admin";
const isSuperAdmin = (user: AuthzUser) => user.platformRole === "super_admin";

// Shop roles belong to customer accounts; admin accounts never act as a shop.
function shopRole(user: AuthzUser, shopId: string | undefined): ShopRole | undefined {
  if (!shopId || !isCustomer(user)) return undefined;
  return user.memberships.find((membership) => membership.shopId === shopId)?.role;
}

const inShop =
  (...roles: ShopRole[]): Rule =>
  (user, resource) => {
    const role = shopRole(user, resource.shopId);
    return role !== undefined && roles.includes(role);
  };

const isOwnBooking: Rule = (user, resource) =>
  isCustomer(user) && !!resource.customerId && resource.customerId === user.id;

const isOwnCustomer: Rule = isOwnBooking;

const isAssigned: Rule = (user, resource) =>
  !!resource.assignedStaffId && resource.assignedStaffId === user.id;

// Staff work only bookings assigned to them; managers and owners work every
// booking in their shop.
const worksBooking: Rule = (user, resource) =>
  inShop("owner", "manager")(user, resource) ||
  (inShop("staff")(user, resource) && isAssigned(user, resource));

const RULES = {
  "shop:read": () => true,

  // User account and profile.
  "user:update_own": isOwnCustomer,
  "user:delete_own": isOwnCustomer,
  "address:manage_own": isOwnCustomer,
  "notification:read_own": isOwnCustomer,
  "notification:manage_own": isOwnCustomer,

  // As a customer. Booking state rules (for example, reviews only after
  // Completed) are checked by the booking module, not here.
  "booking:create": isCustomer,
  "booking:read_own": isOwnBooking,
  "booking:cancel_own": isOwnBooking,
  "booking:reschedule_own": isOwnBooking,
  "booking:accept_quote": isOwnBooking,
  "booking:pay": isOwnBooking,
  "review:create": isOwnBooking,
  "review:report": isCustomer,
  "shop:create": isCustomer,

  // As a shop.
  "shop:update": (user, resource) => isAdmin(user) || inShop("owner", "manager")(user, resource),
  "service:manage": inShop("owner", "manager"),
  // Admin reads must be written to audit_log by the caller.
  "booking:read": (user, resource) => isAdmin(user) || worksBooking(user, resource),
  "booking:accept": worksBooking,
  "booking:decline": worksBooking,
  "booking:quote": worksBooking,
  "booking:complete": worksBooking,
  "booking:no_show": worksBooking,
  // Shop-side cancel (reason required). The lifecycle allows it; the RBAC
  // table has no row for it, so it follows accept and decline.
  "booking:cancel": worksBooking,
  "booking:walk_in": inShop("owner", "manager", "staff"),
  "schedule:block": inShop("owner", "manager", "staff"),
  "message:send": (user, resource) => isOwnBooking(user, resource) || worksBooking(user, resource),
  "message:read": (user, resource) =>
    isOwnBooking(user, resource) ||
    worksBooking(user, resource) ||
    (isAdmin(user) && resource.disputed === true),
  "quick_reply:manage": inShop("owner", "manager"),
  "review:reply": inShop("owner", "manager"),
  "shop_member:manage": (user, resource) =>
    inShop("owner")(user, resource) ||
    (inShop("manager")(user, resource) && resource.memberRole === "staff"),
  "shop_document:upload": inShop("owner"),
  "shop_document:read": (user, resource) => isAdmin(user) || inShop("owner")(user, resource),
  "shop:delete": (user, resource) => isSuperAdmin(user) || inShop("owner")(user, resource),
  "shop:transfer": (user, resource) => isSuperAdmin(user) || inShop("owner")(user, resource),

  // Platform administration.
  "admin:shop.verify": isAdmin,
  "admin:shop.suspend": isAdmin,
  "admin:review.hide": isAdmin,
  "admin:report.resolve": isAdmin,
  "admin:user.suspend": isAdmin,
  "admin:category.manage": isAdmin,
  "admin:city.manage": isAdmin,
  "admin:announcement.manage": isAdmin,
  "admin:fraud.manage": isAdmin,
  "admin:admin.manage": isSuperAdmin,
  "admin:settings.manage": isSuperAdmin,
  "admin:audit.read": isSuperAdmin,
  "admin:analytics.read": isAdmin,
  // Set up and use the admin console's second factor (TOTP).
  "admin:two_factor.manage": isAdmin,
  "analytics:read_shop": (user, resource) =>
    isAdmin(user) || inShop("owner", "manager")(user, resource),
} satisfies Record<string, Rule>;

export type Permission = keyof typeof RULES;
export const PERMISSIONS = Object.keys(RULES) as Permission[];

/** Whether the user (null for a guest) may use the permission on the resource. */
export function can(
  user: AuthzUser | null,
  permission: Permission,
  resource: AuthzResource = {},
): boolean {
  if (permission === "shop:read") return true;
  if (!user || user.status !== "active") return false;
  return RULES[permission](user, resource);
}

/**
 * Throws unless can() allows it. Pass hideExistence for records the user must
 * not learn exist, so the denial reads as NOT_FOUND instead of FORBIDDEN.
 */
export function assertCan(
  user: AuthzUser | null,
  permission: Permission,
  resource: AuthzResource = {},
  options: { hideExistence?: boolean } = {},
): void {
  if (can(user, permission, resource)) return;

  console.warn(
    JSON.stringify({
      event: "authz.denied",
      permission,
      userId: user?.id ?? null,
      shopId: resource.shopId ?? null,
    }),
  );
  if (!user) throw new AppError("UNAUTHENTICATED");
  throw new AppError(options.hideExistence ? "NOT_FOUND" : "FORBIDDEN");
}
