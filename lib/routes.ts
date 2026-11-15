// Route groups that middleware.ts treats differently.

/** Need a session. /admin also needs a second factor (TOTP). */
export const SIGNED_IN_ROUTES = ["/account", "/dashboard", "/admin", "/explore"];

/**
 * Rendered per request: they get a session refresh and a nonce-based CSP.
 * Everything else may be cached at the edge. Each route here must render
 * dynamically, because a nonce on a cached page blocks its own scripts.
 */
export const DYNAMIC_ROUTES = [
  ...SIGNED_IN_ROUTES,
  "/book",
  "/login",
  "/verify",
  "/search",
  "/auth",
];

export function matchesRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
