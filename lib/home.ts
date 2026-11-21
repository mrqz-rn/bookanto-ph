import type { AuthzUser } from "@/lib/authz";
import { matchesRoute } from "@/lib/routes";

// Where each kind of account belongs. Store accounts (active shop members)
// live in the dashboard and stay out of the marketplace; user accounts live
// in the marketplace and stay out of the dashboard.

/** Landing route that resolves the signed-in user's home. Default `next` after login. */
export const POST_LOGIN_ROUTE = "/auth/continue";

/** Marketplace routes a store account can't open. */
export const MARKETPLACE_ROUTES = ["/explore", "/search"];

/** Public page that explains shop registration to owners and service providers. */
export const SHOP_REGISTRATION_ROUTE = "/register-shop";

/** The shop onboarding wizard. Needs a session; middleware sends guests to /login. */
export const SHOP_SETUP_ROUTE = "/dashboard/setup";

/** Dashboard routes a user account can still open, so it can list a shop. */
export const DASHBOARD_ONBOARDING_ROUTES = [SHOP_SETUP_ROUTE];

/** Whether a post-login `next` leads into shop registration. */
export function isShopSetupPath(next: string | null | undefined): boolean {
  if (!next) return false;
  const pathname = next.split(/[?#]/)[0] ?? next;
  return matchesRoute(pathname, DASHBOARD_ONBOARDING_ROUTES);
}

type HomeUser = Pick<AuthzUser, "platformRole" | "memberships">;

const isAdmin = (user: HomeUser) =>
  user.platformRole === "admin" || user.platformRole === "super_admin";

/** A customer account with at least one active shop membership. */
export function isStoreAccount(user: HomeUser): boolean {
  return !isAdmin(user) && user.memberships.length > 0;
}

/** The route a user lands on after logging in. */
export function homePathFor(user: HomeUser): string {
  if (isAdmin(user)) return "/admin";
  return isStoreAccount(user) ? "/dashboard" : "/explore";
}

/** Whether the account may open this path. Admins aren't restricted here. */
export function canAccessPath(user: HomeUser, pathname: string): boolean {
  if (isAdmin(user)) return true;
  if (isStoreAccount(user)) return !matchesRoute(pathname, MARKETPLACE_ROUTES);
  return (
    !matchesRoute(pathname, ["/dashboard"]) || matchesRoute(pathname, DASHBOARD_ONBOARDING_ROUTES)
  );
}

/**
 * Where to send a user after login: `next` when it's a safe same-site path the
 * account may open, otherwise the account's home.
 */
export function resolvePostLoginPath(user: HomeUser, next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return homePathFor(user);
  }
  const pathname = next.split(/[?#]/)[0] ?? next;
  if (matchesRoute(pathname, [POST_LOGIN_ROUTE])) return homePathFor(user);
  return canAccessPath(user, pathname) ? next : homePathFor(user);
}
