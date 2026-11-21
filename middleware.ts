import { NextResponse, type NextRequest } from "next/server";

import { buildCsp } from "@/lib/csp";
import { publicEnv } from "@/lib/public-env";
import { DYNAMIC_ROUTES, matchesRoute, SIGNED_IN_ROUTES } from "@/lib/routes";
import { getMiddlewareSession } from "@/lib/supabase/middleware";

const dev = process.env.NODE_ENV === "development";
const supabaseUrl = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
const cacheablePageCsp = buildCsp({ supabaseUrl, dev });

export async function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // If Supabase Auth falls back to the root Site URL (/?code=...) when
  // /auth/callback isn't in the project's Redirect URLs allow-list yet,
  // forward the OAuth/magic-link callback parameters to /auth/callback.
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("error_code"))) {
    return NextResponse.redirect(new URL(`/auth/callback${search}`, request.url));
  }

  // Pages that may be served from the edge cache skip the session lookup, so
  // they never carry Set-Cookie, and use the nonce-free policy.
  if (!matchesRoute(pathname, DYNAMIC_ROUTES)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", cacheablePageCsp);
    return response;
  }

  const session = await getMiddlewareSession(request);

  // Coarse guards only. Shop membership and admin role are checked in the
  // route layouts, and every action calls assertCan.
  if (matchesRoute(pathname, SIGNED_IN_ROUTES)) {
    if (!session.authId) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return session.applyTo(NextResponse.redirect(login));
    }
    // The admin console needs a second factor (TOTP). Server actions post to
    // /admin/* too, so this covers them; /api/admin routes check it themselves.
    if (matchesRoute(pathname, ["/admin"]) && session.aal !== "aal2" && !dev) {
      const twoFactor = new URL("/two-factor", request.url);
      twoFactor.searchParams.set("next", `${pathname}${search}`);
      return session.applyTo(NextResponse.redirect(twoFactor));
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({ nonce, supabaseUrl, dev });

  // Next.js reads the nonce from the request's CSP header and adds it to its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return session.applyTo(response);
}

export const config = {
  matcher: [
    // Everything except API routes, Next.js internals, service worker and static files.
    "/((?!api/|_next/static|_next/image|sw\\.js|.*\\.(?:ico|png|jpg|jpeg|gif|webp|avif|svg|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
