import { NextResponse } from "next/server";

import { toViewer } from "@/features/account/viewer";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * The header's view of the session, for pages served from the edge cache
 * (they can't read cookies while rendering). Never cached.
 */
export async function GET() {
  const viewer = toViewer(await getCurrentUser());
  return NextResponse.json({ viewer }, { headers: { "Cache-Control": "private, no-store" } });
}
