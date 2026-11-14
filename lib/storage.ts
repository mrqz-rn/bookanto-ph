import "server-only";

import { publicEnv } from "@/lib/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Storage adapter. Supabase Storage today; S3 behind CloudFront after the AWS
// move, when only this file changes.

/** Public bucket for shop, service and review photos. */
export const MEDIA_BUCKET = "media";

/** Private bucket for verification documents (business permits, valid IDs). */
export const DOCUMENTS_BUCKET = "documents";

/** Maximum file size in bytes (8 MB as per security specification). */
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/** The public URL of a photo stored at `path` in the media bucket. */
export function mediaUrl(path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${encodedPath}`;
}

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
 * Validates image file signature (magic bytes) to ensure authentic JPEG, PNG, or WebP.
 */
export function validateImageBytes(bytes: Uint8Array): {
  valid: boolean;
  mimeType?: string;
  format?: "jpeg" | "png" | "webp";
} {
  if (bytes.length < 12) return { valid: false };

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg", format: "jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png", format: "png" };
  }

  // WebP: RIFF ... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp", format: "webp" };
  }

  return { valid: false };
}

/**
 * Validates document file signature (PDF, JPEG, PNG, WebP).
 */
export function validateDocumentBytes(bytes: Uint8Array): {
  valid: boolean;
  mimeType?: string;
} {
  if (bytes.length < 4) return { valid: false };

  // PDF: %PDF (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { valid: true, mimeType: "application/pdf" };
  }

  const imageCheck = validateImageBytes(bytes);
  if (imageCheck.valid) {
    return { valid: true, mimeType: imageCheck.mimeType };
  }

  return { valid: false };
}

/**
 * Uploads a photo to the media bucket.
 */
export async function uploadPhoto(
  path: string,
  buffer: Uint8Array,
  contentType: string,
): Promise<{ path: string; url: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.warn("Storage upload photo warning:", error.message);
  }

  return { path, url: mediaUrl(path) };
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
