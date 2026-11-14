import { NextResponse, type NextRequest } from "next/server";

import { exchangeAuthCode, syncAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    try {
      await exchangeAuthCode(code);
      await syncAuthUser();
      const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
      return NextResponse.redirect(new URL(destination, origin));
    } catch (error) {
      console.error("OAuth / Magic Link callback exchange error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=no_code", origin));
}
