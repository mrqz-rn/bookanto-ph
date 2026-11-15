import { NextResponse, type NextRequest } from "next/server";

import { exchangeAuthCode } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error") ?? searchParams.get("error_code");
  const next = searchParams.get("next") ?? "/account";

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  if (code) {
    try {
      await exchangeAuthCode(code);
      const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
      return NextResponse.redirect(new URL(destination, origin));
    } catch (error) {
      console.error("OAuth / Magic Link callback exchange error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=no_code", origin));
}
