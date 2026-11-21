import { publicEnv } from "@/lib/public-env";

/** Public bucket for shop, service and review photos. */
export const MEDIA_BUCKET = "media";

/** Private bucket for verification documents (business permits, valid IDs). */
export const DOCUMENTS_BUCKET = "documents";

export { DOCUMENT_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./file-types";

/** The public URL of a photo stored at `path` in the media bucket. */
export function mediaUrl(path: string): string {
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${encodedPath}`;
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
