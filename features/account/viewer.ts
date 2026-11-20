import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { homePathFor } from "@/lib/home";

import type { Viewer } from "./constants";

const KIND_BY_HOME: Record<string, Viewer["kind"]> = {
  "/admin": "admin",
  "/dashboard": "store",
};

/** The browser-safe slice of the signed-in user the site header needs. */
export function toViewer(user: CurrentUser | null): Viewer | null {
  if (!user) return null;
  const fullName = user.name?.trim() || null;
  return {
    name: fullName ?? user.email ?? user.phone ?? "Your account",
    firstName: fullName?.split(/\s+/)[0] ?? null,
    contact: user.email ?? user.phone,
    kind: KIND_BY_HOME[homePathFor(user)] ?? "customer",
  };
}
