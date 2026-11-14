import "server-only";

import { isIP } from "node:net";

import { headers } from "next/headers";

/** The caller's IP address as reported by Vercel's proxy, or null if unknown. */
export async function getClientIp(): Promise<string | null> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip");
  return ip && isIP(ip) ? ip : null;
}
