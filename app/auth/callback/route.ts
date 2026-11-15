import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_AUTH_REDIRECT } from "@/features/auth/constants";
import { exchangeAuthCode } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error") ?? searchParams.get("error_code");
  const next = searchParams.get("next");

  if (oauthError) {
    console.error(
      "OAuth callback error from provider:",
      oauthError,
      searchParams.get("error_description"),
    );
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  if (code) {
    try {
      await exchangeAuthCode(code);
      // /auth/continue reads the new session and picks the account's home
      // (dashboard for store accounts, marketplace for user accounts).
      const destination = new URL(DEFAULT_AUTH_REDIRECT, origin);
      if (next && next !== DEFAULT_AUTH_REDIRECT) destination.searchParams.set("next", next);
      return NextResponse.redirect(destination);
    } catch (error) {
      console.error("OAuth / Magic Link callback exchange error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=no_code", origin));
}
