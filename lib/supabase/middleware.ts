import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/lib/public-env";

import { SESSION_COOKIE_OPTIONS } from "./cookies";

type PendingCookie = { name: string; value: string; options: CookieOptions };

export type MiddlewareSession = {
  /** The verified user id, or null when signed out. */
  authId: string | null;
  /** Authenticator assurance level: "aal2" after a second factor (TOTP). */
  aal: string | null;
  /** Writes refreshed session cookies and their no-cache headers onto a response. */
  applyTo(response: NextResponse): NextResponse;
};

/** Verifies the session, refreshing expired tokens. */
export async function getMiddlewareSession(request: NextRequest): Promise<MiddlewareSession> {
  const pendingCookies: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Update the request too, so the page rendered after middleware sees the new tokens.
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          pendingCookies.push(...cookiesToSet);
          pendingHeaders = headers;
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  return {
    authId: data?.claims.sub ?? null,
    aal: data?.claims.aal ?? null,
    applyTo(response) {
      for (const { name, value, options } of pendingCookies) {
        response.cookies.set(name, value, options);
      }
      for (const [key, value] of Object.entries(pendingHeaders)) response.headers.set(key, value);
      return response;
    },
  };
}
