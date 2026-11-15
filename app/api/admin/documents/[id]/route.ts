import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { documentSignedUrl } from "@/lib/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || (user.platformRole !== "admin" && user.platformRole !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [doc] = await db
    .select({ id: media.id, path: media.path, kind: media.kind, ownerId: media.ownerId })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  assertCan(user, "shop_document:read", { shopId: doc.ownerId });

  const url = await documentSignedUrl(doc.path);
  return NextResponse.redirect(url);
}
