import "server-only";

import { AppError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  DOCUMENT_MIME_TYPES,
  DOCUMENTS_BUCKET,
  MAX_FILE_SIZE_BYTES,
  MEDIA_BUCKET,
  mediaUrl,
} from "./media";

export * from "./media";

// Storage adapter. Supabase Storage today; S3 behind CloudFront after the AWS
// move, when only this file changes.

// Verification documents live in a private bucket with no storage policies:
// only the secret-key client (after assertCan) can touch them. Owners upload
// straight to storage through a one-time signed URL, so the file never passes
// through a server action (Vercel caps request bodies at 4.5 MB).

let documentsBucket: Promise<void> | null = null;

/** Creates the private documents bucket on first use (local and hosted alike). */
function ensureDocumentsBucket(): Promise<void> {
  documentsBucket ??= (async () => {
    const storage = createSupabaseAdminClient().storage;
    const { error: missing } = await storage.getBucket(DOCUMENTS_BUCKET);
    if (!missing) return;
    const { error } = await storage.createBucket(DOCUMENTS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: [...DOCUMENT_MIME_TYPES],
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Could not create the ${DOCUMENTS_BUCKET} bucket: ${error.message}`);
    }
  })().catch((err: unknown) => {
    documentsBucket = null;
    throw err;
  });
  return documentsBucket;
}

const storageUnavailable = (cause: unknown) => {
  console.error("Document storage error:", cause);
  return new AppError("INTERNAL", "We couldn't reach file storage. Please try again.");
};

/**
 * A one-time URL the browser can upload one document to, at a path the server
 * chose. Valid for 2 hours; the file still has to be confirmed afterwards.
 */
export async function createDocumentUploadUrl(path: string): Promise<{ uploadUrl: string }> {
  try {
    await ensureDocumentsBucket();
    const { data, error } = await createSupabaseAdminClient()
      .storage.from(DOCUMENTS_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data?.signedUrl) throw error ?? new Error("No signed upload URL");
    return { uploadUrl: data.signedUrl };
  } catch (err) {
    throw err instanceof AppError ? err : storageUnavailable(err);
  }
}

/** Reads an uploaded document back so its real type and size can be checked. Null if missing. */
export async function readDocument(path: string): Promise<Uint8Array | null> {
  const { data, error } = await createSupabaseAdminClient()
    .storage.from(DOCUMENTS_BUCKET)
    .download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/** Deletes documents from the private bucket. */
export async function removeDocuments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await createSupabaseAdminClient().storage.from(DOCUMENTS_BUCKET).remove(paths);
  if (error) console.error("Document delete error:", error.message);
}

/**
 * Creates a signed URL for a private document with 5-minute expiry (300 seconds).
 * Callers check permissions first (shop_document:read).
 */
export async function documentSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await createSupabaseAdminClient()
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw storageUnavailable(error);
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
