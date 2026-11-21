import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmShopDocument,
  removeShopMedia,
  startShopDocumentUpload,
} from "@/features/shops/actions";
import { isShopDocumentPath } from "@/features/shops/schema";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";
import * as storage from "@/lib/storage";

vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  createDocumentUploadUrl: vi.fn(),
  readDocument: vi.fn(),
  removeDocuments: vi.fn(),
}));

/** A query chain that resolves to `rows` whether or not it ends in .limit(). */
function rows(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(result);
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain as never;
}

const PDF = new TextEncoder().encode("%PDF-1.4\n% scan\n");

describe("verification document uploads", () => {
  const shopId = randomUUID();
  const owner: authModule.CurrentUser = {
    id: randomUUID(),
    authId: "auth-owner",
    name: "Kuya Jun",
    phone: "+639171234567",
    email: "jun@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [{ shopId, role: "owner" }],
  };
  const manager: authModule.CurrentUser = {
    ...owner,
    id: randomUUID(),
    memberships: [{ shopId, role: "manager" }],
  };
  const issuedPath = (type = "owner_id", ext = "pdf") => `${shopId}/${type}-${randomUUID()}.${ext}`;

  beforeEach(() => {
    vi.spyOn(authModule, "requireUser").mockResolvedValue(owner);
    vi.mocked(storage.createDocumentUploadUrl).mockResolvedValue({
      uploadUrl: "https://storage.example/upload?token=t",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(storage.readDocument).mockReset();
    vi.mocked(storage.removeDocuments).mockReset();
  });

  describe("isShopDocumentPath", () => {
    it("accepts only the shape the server hands out for that shop and type", () => {
      const path = issuedPath("business_permit");
      expect(isShopDocumentPath(path, shopId, "business_permit")).toBe(true);
      expect(isShopDocumentPath(path, randomUUID(), "business_permit")).toBe(false);
      expect(isShopDocumentPath(path, shopId, "owner_id")).toBe(false);
      expect(isShopDocumentPath(`${shopId}/owner_id-../../x.pdf`, shopId, "owner_id")).toBe(false);
      expect(isShopDocumentPath(issuedPath("owner_id", "html"), shopId, "owner_id")).toBe(false);
    });
  });

  describe("startShopDocumentUpload", () => {
    it("accepts the document type the form sends (the old 'check the highlighted fields' bug)", async () => {
      vi.spyOn(db, "select").mockReturnValue(rows([{ count: 0 }]));

      const res = await startShopDocumentUpload({
        shopId,
        documentType: "business_permit",
        contentType: "image/jpeg",
        size: 3 * 1024 * 1024,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.uploadUrl).toBe("https://storage.example/upload?token=t");
      expect(isShopDocumentPath(res.data.path, shopId, "business_permit")).toBe(true);
      expect(res.data.path.endsWith(".jpg")).toBe(true);
      expect(storage.createDocumentUploadUrl).toHaveBeenCalledWith(res.data.path);
    });

    it("rejects files over 8 MB, unsupported types and unknown fields", async () => {
      const base = { shopId, documentType: "owner_id", contentType: "application/pdf", size: 1000 };
      for (const input of [
        { ...base, size: 9 * 1024 * 1024 },
        { ...base, contentType: "text/html" },
        { ...base, path: "someone-else/file.pdf" },
      ]) {
        const res = await startShopDocumentUpload(input);
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.code).toBe("VALIDATION");
      }
      expect(storage.createDocumentUploadUrl).not.toHaveBeenCalled();
    });

    it("is for the shop owner only", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(manager);
      const res = await startShopDocumentUpload({
        shopId,
        documentType: "owner_id",
        contentType: "application/pdf",
        size: 1000,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
    });

    it("caps the number of documents per shop", async () => {
      vi.spyOn(db, "select").mockReturnValue(rows([{ count: 10 }]));
      const res = await startShopDocumentUpload({
        shopId,
        documentType: "owner_id",
        contentType: "application/pdf",
        size: 1000,
      });
      expect(res.ok).toBe(false);
      expect(storage.createDocumentUploadUrl).not.toHaveBeenCalled();
    });
  });

  describe("confirmShopDocument", () => {
    it("records a real PDF", async () => {
      const path = issuedPath();
      vi.spyOn(db, "select")
        .mockReturnValueOnce(rows([])) // not recorded yet
        .mockReturnValueOnce(rows([{ count: 1 }])); // sort order
      const values = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "media-1" }]),
      });
      vi.spyOn(db, "insert").mockReturnValue({ values } as never);
      vi.mocked(storage.readDocument).mockResolvedValue(PDF);

      const res = await confirmShopDocument({ shopId, documentType: "owner_id", path });

      expect(res).toEqual({ ok: true, data: { mediaId: "media-1", path } });
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: shopId, path, kind: "document", sortOrder: 1 }),
      );
    });

    it("deletes and refuses a file whose signature isn't a document", async () => {
      const path = issuedPath();
      vi.spyOn(db, "select").mockReturnValue(rows([]));
      const insert = vi.spyOn(db, "insert");
      vi.mocked(storage.readDocument).mockResolvedValue(new TextEncoder().encode("<html>"));

      const res = await confirmShopDocument({ shopId, documentType: "owner_id", path });

      expect(res.ok).toBe(false);
      expect(storage.removeDocuments).toHaveBeenCalledWith([path]);
      expect(insert).not.toHaveBeenCalled();
    });

    it("refuses a path from another shop without touching storage", async () => {
      const otherShopPath = `${randomUUID()}/owner_id-${randomUUID()}.pdf`;
      const res = await confirmShopDocument({
        shopId,
        documentType: "owner_id",
        path: otherShopPath,
      });
      expect(res.ok).toBe(false);
      expect(storage.readDocument).not.toHaveBeenCalled();
    });

    it("asks for a re-upload when the file never arrived", async () => {
      vi.spyOn(db, "select").mockReturnValue(rows([]));
      vi.mocked(storage.readDocument).mockResolvedValue(null);
      const res = await confirmShopDocument({
        shopId,
        documentType: "owner_id",
        path: issuedPath(),
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.message).toMatch(/didn't receive/);
    });
  });

  describe("removeShopMedia", () => {
    it("doesn't let a manager remove the owner's documents", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(manager);
      vi.spyOn(db, "select").mockReturnValue(
        rows([{ id: randomUUID(), path: issuedPath(), kind: "document" }]),
      );
      const del = vi.spyOn(db, "delete");

      const res = await removeShopMedia({ shopId, mediaId: randomUUID() });

      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
      expect(del).not.toHaveBeenCalled();
    });

    it("deletes the stored file when the owner removes a document", async () => {
      const path = issuedPath();
      vi.spyOn(db, "select").mockReturnValue(rows([{ id: randomUUID(), path, kind: "document" }]));
      vi.spyOn(db, "delete").mockReturnValue({ where: vi.fn().mockResolvedValue([]) } as never);

      const res = await removeShopMedia({ shopId, mediaId: randomUUID() });

      expect(res.ok).toBe(true);
      expect(storage.removeDocuments).toHaveBeenCalledWith([path]);
    });
  });
});
