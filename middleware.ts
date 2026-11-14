import { NextResponse, type NextRequest } from "next/server";

import { buildCsp } from "@/lib/csp";
import { publicEnv } from "@/lib/public-env";
import { DYNAMIC_ROUTES, matchesRoute, SIGNED_IN_ROUTES } from "@/lib/routes";
import { getMiddlewareSession } from "@/lib/supabase/middleware";

const dev = process.env.NODE_ENV === "development";
const supabaseUrl = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
const cacheablePageCsp = buildCsp({ supabaseUrl, dev });

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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
    const needsSecondFactor = matchesRoute(pathname, ["/admin"]) && session.aal !== "aal2";
    if (!session.authId || needsSecondFactor) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      if (session.authId) login.searchParams.set("mfa", "required");
      return session.applyTo(NextResponse.redirect(login));
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
    // Everything except API routes, Next.js internals and static files.
    "/((?!api/|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|avif|svg|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
