// Upload limits shared by server and browser code. No imports, so client
// components can use it without pulling in env parsing or Zod.

/** Maximum upload size in bytes (8 MB, per the plan's security rules). */
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/** Verification document types and the extension each is stored with. */
export const DOCUMENT_FILE_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type DocumentMimeType = keyof typeof DOCUMENT_FILE_TYPES;

export const DOCUMENT_MIME_TYPES = Object.keys(DOCUMENT_FILE_TYPES) as DocumentMimeType[];

export function isDocumentMimeType(value: string): value is DocumentMimeType {
  return Object.hasOwn(DOCUMENT_FILE_TYPES, value);
}
