import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RatingStars } from "@/features/reviews/components/rating-stars";
import { ReviewCard, type ReviewCardData } from "@/features/reviews/components/review-card";
import { ReviewHighlights } from "@/features/reviews/components/review-highlights";

describe("reviews UI components", () => {
  describe("RatingStars", () => {
    it("renders read-only rating with accessible label", () => {
      const html = renderToStaticMarkup(<RatingStars value={4} size="sm" />);
      expect(html).toContain('aria-label="Rating: 4 out of 5 stars"');
      expect(html).toContain('role="img"');
    });

    it("renders interactive radio group with accessible options when onChange is provided", () => {
      const html = renderToStaticMarkup(
        <RatingStars value={5} onChange={() => {}} label="Rate your service" />,
      );
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain("Rate your service");
      expect(html).toContain('aria-label="5 stars - Excellent / Highly recommended"');
    });
  });

  describe("ReviewHighlights", () => {
    it("renders empty state when there are no reviews", () => {
      const html = renderToStaticMarkup(
        <ReviewHighlights
          ratingAvg={0}
          ratingCount={0}
          recommendPercentage={0}
          distribution={{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }}
          highlights={[]}
          photosCount={0}
          showcasePhotos={[]}
        />,
      );
      expect(html).toContain("No reviews yet");
      expect(html).toContain("Be the first customer to book an appointment");
    });

    it("renders rating score, distribution bars, and highlight tags", () => {
      const html = renderToStaticMarkup(
        <ReviewHighlights
          ratingAvg={4.8}
          ratingCount={24}
          recommendPercentage={96}
          distribution={{ 1: 0, 2: 0, 3: 1, 4: 5, 5: 18 }}
          highlights={[
            { id: "clean", label: "Clean & Sanitized", count: 12 },
            { id: "friendly", label: "Friendly & Accommodating", count: 15 },
          ]}
          photosCount={6}
          showcasePhotos={[
            { id: "p1", url: "https://example.com/p1.jpg" },
            { id: "p2", url: "https://example.com/p2.jpg" },
          ]}
        />,
      );

      expect(html).toContain("4.8");
      expect(html).toContain("Based on 24 verified reviews");
      expect(html).toContain("96% recommend this shop");
      expect(html).toContain("Clean &amp; Sanitized");
      expect(html).toContain("Friendly &amp; Accommodating");
      expect(html).toContain("Customer Photos (6)");
    });
  });

  describe("ReviewCard", () => {
    const mockReview: ReviewCardData = {
      id: "rev-1",
      bookingId: "book-1",
      customerId: "cust-1",
      customerName: "Maria Santos",
      rating: 5,
      comment: "Napakabait ng staff at malinis ang salon. Highly recommended!",
      reply: "Maraming salamat po Ma'am Maria! Balik po kayo soon.",
      serviceName: "Gel Manicure & Pedicure",
      photos: [
        { id: "photo-1", path: "reviews/1.jpg", url: "https://example.com/1.jpg", sortOrder: 0 },
      ],
      createdAt: "2026-11-10T10:00:00.000Z",
      updatedAt: "2026-11-10T10:00:00.000Z",
    };

    it("renders customer name, rating, comment, photos, and shop reply", () => {
      const html = renderToStaticMarkup(
        <ReviewCard review={mockReview} shopId="shop-1" canReply={false} />,
      );

      expect(html).toContain("Maria Santos");
      expect(html).toContain("Verified");
      expect(html).toContain("Gel Manicure &amp; Pedicure");
      expect(html).toContain("Napakabait ng staff at malinis ang salon.");
      expect(html).toContain("Response from the owner");
      expect(html).toContain("Maraming salamat po Ma&#x27;am Maria!");
      expect(html).toContain("Report");
    });
  });
});
