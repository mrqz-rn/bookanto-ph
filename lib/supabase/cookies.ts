import type { CookieOptionsWithName } from "@supabase/ssr";

// Session cookies are httpOnly: browser code never reads the session. Realtime
// subscriptions get a token from the server through lib/realtime.ts instead.
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
