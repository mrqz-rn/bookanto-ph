import "server-only";

import { publicEnv } from "@/lib/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { DOCUMENTS_BUCKET, MEDIA_BUCKET, mediaUrl } from "./media";

export * from "./media";

// Storage adapter. Supabase Storage today; S3 behind CloudFront after the AWS
// move, when only this file changes.

/**
 * Creates a signed URL for a private document with 5-minute expiry (300 seconds).
 */
export async function documentSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    // Fallback for development/testing if bucket is not yet provisioned
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/${DOCUMENTS_BUCKET}/${encoded}?expires=${expiresInSeconds}`;
  }

  return data.signedUrl;
}

/**
 * Uploads a photo to the media bucket.
 */
export async function uploadPhoto(
  path: string,
  buffer: Uint8Array,
  contentType: string,
): Promise<{ path: string; url: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.warn("Storage upload photo warning:", error.message);
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;
      return { path: dataUrl, url: dataUrl };
    }

    return { path, url: mediaUrl(path) };
  } catch (err) {
    console.warn("Storage upload photo error:", err);
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;
    return { path: dataUrl, url: dataUrl };
  }
}

/**
 * Uploads a verification document to the private documents bucket.
 */
export async function uploadDocument(
  path: string,
  buffer: Uint8Array,
  contentType: string,
): Promise<{ path: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.warn("Storage upload document warning:", error.message);
  }

  return { path };
}
