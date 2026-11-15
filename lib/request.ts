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

/**
 * Resolves the origin URL (protocol + host:port) of the incoming request,
 * or null if called outside an active HTTP request context (e.g. tests or jobs).
 */
export async function getRequestOrigin(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    if (!host) return null;
    const proto =
      requestHeaders.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}
