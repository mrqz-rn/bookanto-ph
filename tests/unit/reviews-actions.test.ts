import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createReview,
  hideReview,
  replyToReview,
  reportReview,
  resolveReport,
} from "@/features/reviews/actions";
import * as authModule from "@/lib/auth";
import { db } from "@/lib/db";

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("reviews actions", () => {
  const customerId = randomUUID();
  const shopOwnerId = randomUUID();
  const adminId = randomUUID();
  const otherCustomerId = randomUUID();

  const shopId = randomUUID();
  const bookingId = randomUUID();
  const reviewId = randomUUID();
  const reportId = randomUUID();

  const customerUser: authModule.CurrentUser = {
    id: customerId,
    authId: "auth-customer-1",
    name: "Customer Juan",
    phone: "+639171234567",
    email: "juan@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [],
  };

  const shopOwnerUser: authModule.CurrentUser = {
    id: shopOwnerId,
    authId: "auth-owner-1",
    name: "Shop Owner Pedro",
    phone: "+639181234567",
    email: "pedro@example.com",
    platformRole: "customer",
    status: "active",
    memberships: [{ shopId, role: "owner" }],
  };

  const adminUser: authModule.CurrentUser = {
    id: adminId,
    authId: "auth-admin-1",
    name: "Admin Maria",
    phone: "+639191234567",
    email: "admin@bookanto.ph",
    platformRole: "admin",
    status: "active",
    memberships: [],
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createReview", () => {
    it("successfully creates a review and recomputes shop rating averages", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      let selectCalls = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCalls++;
              if (selectCalls === 1) {
                return Promise.resolve([
                  {
                    id: bookingId,
                    customerId,
                    shopId,
                    status: "completed",
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      })) as unknown as typeof db.select);

      // 3. Mock transaction for review insert & shop rating update
      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: reviewId }]),
            }),
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ avg: 4.8, count: 5 }]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return callback(mockTx);
      }) as unknown as typeof db.transaction);

      const res = await createReview({
        bookingId,
        rating: 5,
        comment: "Napakagaling ng barbero! Napakalinis ng shop.",
        photoPaths: ["reviews/photo1.jpg"],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.reviewId).toBe(reviewId);
        expect(res.data.ratingAvg).toBe(4.8);
        expect(res.data.ratingCount).toBe(5);
      }
    });

    it("rejects review creation if booking status is not completed", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: bookingId,
                customerId,
                shopId,
                status: "confirmed", // Not completed!
              },
            ]),
          }),
        }),
      })) as unknown as typeof db.select);

      const res = await createReview({
        bookingId,
        rating: 5,
        comment: "Great service",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("VALIDATION");
        expect(res.message).toContain("Only completed bookings can be reviewed");
      }
    });

    it("rejects review creation if customer does not own the booking", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: bookingId,
                customerId: otherCustomerId, // Someone else!
                shopId,
                status: "completed",
              },
            ]),
          }),
        }),
      })) as unknown as typeof db.select);

      const res = await createReview({
        bookingId,
        rating: 5,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });

    it("rejects duplicate review if booking is already reviewed", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: bookingId,
                  customerId,
                  shopId,
                  status: "completed",
                },
              ])
              // Existing review exists!
              .mockResolvedValueOnce([{ id: "existing-review-id" }]),
          }),
        }),
      })) as unknown as typeof db.select);

      const res = await createReview({
        bookingId,
        rating: 4,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("CONFLICT");
        expect(res.message).toContain("already submitted a review");
      }
    });
  });

  describe("replyToReview", () => {
    it("allows shop owner to reply to a review belonging to their shop", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(shopOwnerUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: reviewId,
                shopId,
                reply: null,
                hidden: false,
              },
            ]),
          }),
        }),
      })) as unknown as typeof db.select);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const res = await replyToReview({
        reviewId,
        shopId,
        reply: "Salamat po Juan! Sa uulitin!",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.success).toBe(true);
        expect(res.data.reviewId).toBe(reviewId);
      }
    });

    it("denies reply from non-shop-owner user", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: reviewId,
                shopId,
                reply: null,
                hidden: false,
              },
            ]),
          }),
        }),
      })) as unknown as typeof db.select);

      const res = await replyToReview({
        reviewId,
        shopId,
        reply: "Unauthorized reply attempt",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("reportReview", () => {
    it("allows authenticated customer to report a review", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      let selectCalls = 0;
      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCalls++;
              if (selectCalls === 1) {
                return Promise.resolve([
                  {
                    id: reviewId,
                    shopId,
                    hidden: false,
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      })) as unknown as typeof db.select);

      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: reportId }]),
        }),
      } as unknown as ReturnType<typeof db.insert>);

      const res = await reportReview({
        reviewId,
        reason: "Contains offensive profanity and false claims.",
        reasonType: "offensive",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.success).toBe(true);
        expect(res.data.reportId).toBe(reportId);
      }
    });

    it("prevents duplicate report from the same user", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: reviewId,
                  shopId,
                  hidden: false,
                },
              ])
              // Already reported!
              .mockResolvedValueOnce([{ id: "existing-report" }]),
          }),
        }),
      })) as unknown as typeof db.select);

      const res = await reportReview({
        reviewId,
        reason: "Spam content",
        reasonType: "spam",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("CONFLICT");
        expect(res.message).toContain("already submitted a report");
      }
    });
  });

  describe("hideReview", () => {
    it("allows admin to hide a review and updates shop rating stats", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(adminUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: reviewId,
                shopId,
                hidden: false,
              },
            ]),
          }),
        }),
      })) as unknown as typeof db.select);

      vi.spyOn(db, "transaction").mockImplementation((async (
        callback: (t: unknown) => Promise<unknown>,
      ) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ avg: 4.9, count: 4 }]),
            }),
          }),
        };
        return callback(mockTx);
      }) as unknown as typeof db.transaction);

      const res = await hideReview({
        reviewId,
        hidden: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.success).toBe(true);
        expect(res.data.hidden).toBe(true);
      }
    });

    it("denies regular customers from hiding reviews", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(customerUser);

      const res = await hideReview({
        reviewId,
        hidden: true,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("resolveReport", () => {
    it("allows admin to resolve a report", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue(adminUser);

      vi.spyOn(db, "select").mockImplementation((() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: reportId,
                status: "open",
              },
            ]),
          }),
        }),
      })) as unknown as typeof db.select);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const res = await resolveReport({
        reportId,
        status: "resolved",
        resolution: "Review hidden after investigation.",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe("resolved");
      }
    });
  });
});
