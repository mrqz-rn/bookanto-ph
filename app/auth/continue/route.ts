import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { resolvePostLoginPath } from "@/lib/home";

/** Sends a freshly signed-in user to `next` if their account may open it, else to their home. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next");
  const user = await getCurrentUser();

  if (!user) {
    const login = new URL("/login", origin);
    if (next) login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(resolvePostLoginPath(user, next), origin));
}
