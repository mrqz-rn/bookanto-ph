import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CustomerBookingsClient } from "@/app/account/bookings/bookings-client";
import type { MyBooking } from "@/features/bookings/customer-queries";
import type { PublicReviewItem } from "@/features/reviews/queries";

vi.mock("@/features/reviews/actions", () => ({ createReview: vi.fn() }));
vi.mock("@/features/reviews/components/review-photos-uploader", () => ({
  ReviewPhotosUploader: () => null,
}));

function booking(overrides: Partial<MyBooking> & { id: string }): MyBooking {
  return {
    refCode: `BK-${overrides.id}`,
    status: "confirmed",
    bookingType: "slot",
    // 2:30 PM Manila on Dec 6, 2026.
    startAt: "2026-12-06T06:30:00.000Z",
    endAt: null,
    expiresAt: null,
    serviceId: "service-1",
    serviceName: "Haircut",
    shopId: "shop-1",
    shopName: "Kuya Jun's Barbershop",
    shopSlug: "kuya-jun",
    shopAddress: "Rizal St., San Roque, Marikina",
    staffName: null,
    address: null,
    notes: null,
    priceType: "fixed",
    totalCentavos: 35000,
    quotedPriceCentavos: null,
    depositCentavos: 0,
    paidCentavos: 0,
    queueNumber: null,
    rescheduleCount: 0,
    lateCancel: false,
    ...overrides,
  };
}

const review: PublicReviewItem = {
  id: "review-1",
  bookingId: "past-2",
  customerId: "customer-1",
  customerName: "You",
  rating: 5,
  comment: "Very clean shop.",
  reply: "Salamat po!",
  serviceName: "Gel Manicure",
  photos: [],
  createdAt: "2026-11-02T03:00:00.000Z",
  updatedAt: "2026-11-02T03:00:00.000Z",
  matchedHighlights: [],
};

const upcoming = [
  booking({ id: "up-1" }),
  booking({
    id: "up-2",
    status: "requested",
    serviceName: "Aircon Cleaning",
    expiresAt: "2026-12-05T07:00:00.000Z",
  }),
];
const past = [
  booking({ id: "past-1", status: "completed", startAt: "2026-11-01T02:00:00.000Z" }),
  booking({ id: "past-2", status: "completed", serviceName: "Gel Manicure" }),
  booking({ id: "past-3", status: "cancelled", serviceName: "Hair Color" }),
];

function render(initialTab: "upcoming" | "review" | "past") {
  return renderToStaticMarkup(
    <CustomerBookingsClient
      upcomingBookings={upcoming}
      pastBookings={past}
      reviews={{ "past-2": review }}
      initialTab={initialTab}
      todayKey="2026-12-05"
      olderHref="/account/bookings?tab=past&before=x"
      newestHref={null}
    />,
  );
}

describe("CustomerBookingsClient", () => {
  it("shows upcoming bookings in Manila time with what happens next", () => {
    const html = render("upcoming");

    expect(html).toContain("Next up");
    expect(html).toContain("Tomorrow · 2:30 PM");
    expect(html).toContain("You&#x27;re booked. See you there.");
    expect(html).toContain("Awaiting shop");
    expect(html).toContain("The shop has until 3:00 PM, Dec 5 to confirm.");
    expect(html).toContain('href="/account/bookings/up-1"');
  });

  it("counts and lists only completed visits without a review under To review", () => {
    const html = render("review");

    expect(html).toMatch(/To review<span[^>]*>1<\/span>/);
    expect(html).toContain("How was your visit to Kuya Jun&#x27;s Barbershop?");
    expect(html).toContain('aria-label="5 stars"');
    expect(html).not.toContain("Gel Manicure");
    expect(html).not.toContain("Hair Color");
  });

  it("shows the customer's review and the shop's reply on past visits", () => {
    const html = render("past");

    expect(html).toContain("You rated this · Nov 2");
    expect(html).toContain("Very clean shop.");
    expect(html).toContain("Reply from the shop");
    expect(html).toContain("Cancelled");
    expect(html).toContain("Show older bookings");
  });
});
