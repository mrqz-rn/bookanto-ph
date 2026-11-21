import { describe, expect, it } from "vitest";

import {
  DOCUMENTS_BUCKET,
  MAX_FILE_SIZE_BYTES,
  MEDIA_BUCKET,
  mediaUrl,
  validateDocumentBytes,
  validateImageBytes,
} from "@/lib/media";

describe("lib/media", () => {
  it("exports expected bucket and size constants", () => {
    expect(MEDIA_BUCKET).toBe("media");
    expect(DOCUMENTS_BUCKET).toBe("documents");
    expect(MAX_FILE_SIZE_BYTES).toBe(8 * 1024 * 1024);
  });

  describe("mediaUrl", () => {
    it("constructs encoded public storage URL", () => {
      const url = mediaUrl("shops/123/cover photo.jpg");
      expect(url).toContain("/storage/v1/object/public/media/shops/123/cover%20photo.jpg");
    });
  });

  describe("validateImageBytes", () => {
    it("recognizes JPEG magic bytes", () => {
      const bytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const res = validateImageBytes(bytes);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/jpeg");
      expect(res.format).toBe("jpeg");
    });

    it("recognizes PNG magic bytes", () => {
      const bytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const res = validateImageBytes(bytes);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/png");
      expect(res.format).toBe("png");
    });

    it("recognizes WebP magic bytes", () => {
      const bytes = new Uint8Array([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00,
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
      ]);
      const res = validateImageBytes(bytes);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/webp");
      expect(res.format).toBe("webp");
    });

    it("rejects invalid or too short bytes", () => {
      expect(validateImageBytes(new Uint8Array([1, 2, 3])).valid).toBe(false);
      expect(validateImageBytes(new Uint8Array(12).fill(0)).valid).toBe(false);
    });
  });

  describe("validateDocumentBytes", () => {
    it("recognizes PDF magic bytes", () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
      const res = validateDocumentBytes(bytes);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("application/pdf");
    });

    it("recognizes images as valid documents", () => {
      const bytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const res = validateDocumentBytes(bytes);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/jpeg");
    });

    it("rejects unknown document bytes", () => {
      expect(validateDocumentBytes(new Uint8Array([0, 1, 2])).valid).toBe(false);
      expect(validateDocumentBytes(new Uint8Array([0x12, 0x34, 0x56, 0x78])).valid).toBe(false);
    });
  });
});
