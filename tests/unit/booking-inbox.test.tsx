// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acceptBooking, completeBooking, markNoShow } from "@/features/bookings/actions";
import { BookingInbox } from "@/features/bookings/components/booking-inbox";
import type { BookingListItem } from "@/features/bookings/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/bookings/actions", () => ({
  acceptBooking: vi.fn().mockResolvedValue({ ok: true }),
  completeBooking: vi.fn().mockResolvedValue({ ok: true }),
  markNoShow: vi.fn().mockResolvedValue({ ok: true }),
  declineBooking: vi.fn().mockResolvedValue({ ok: true }),
  assignStaff: vi.fn().mockResolvedValue({ ok: true }),
}));

const shopId = "00000000-0000-0000-0000-000000000001";

// Sunday, November 15, 2026 in Manila (UTC+8): 9:30 AM.
const at = (manilaDateTime: string) => new Date(`2026-11-${manilaDateTime}:00+08:00`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("15T09:30"));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function booking(overrides: Partial<BookingListItem>): BookingListItem {
  return {
    id: "b",
    refCode: "BK-0001",
    customerId: "c-1",
    customerName: "Alice Guo",
    customerPhone: "09170001111",
    shopId,
    serviceId: "srv-1",
    serviceName: "Spa Treatment",
    serviceDurationMin: 60,
    staffId: "st-1",
    staffName: "Staff Anna",
    startAt: at("15T10:00").toISOString(),
    endAt: at("15T11:00").toISOString(),
    status: "requested",
    address: null,
    notes: "First time client",
    quotedPriceCentavos: null,
    totalCentavos: 50000,
    isWalkIn: false,
    createdAt: at("15T08:00").toISOString(),
    expiresAt: at("15T10:00").toISOString(),
    bookingType: "slot",
    ...overrides,
  };
}

const request = booking({ id: "b-1", refCode: "BK-REQ-1" });
const confirmed = booking({
  id: "b-2",
  refCode: "BK-CONF-2",
  customerId: "c-2",
  customerName: "Bob Ong",
  serviceName: "Hair Color",
  serviceDurationMin: 90,
  staffId: "st-2",
  staffName: "Staff Bob",
  startAt: at("15T12:00").toISOString(),
  endAt: at("15T13:30").toISOString(),
  status: "confirmed",
  notes: null,
  totalCentavos: 80000,
  expiresAt: null,
});
const completed = booking({
  id: "b-3",
  refCode: "BK-DONE-3",
  customerId: "c-3",
  customerName: "Carla Reyes",
  serviceName: "Manicure",
  startAt: at("14T15:00").toISOString(),
  endAt: at("14T16:00").toISOString(),
  status: "completed",
  notes: null,
  expiresAt: null,
});
const unmarked = booking({
  id: "b-4",
  refCode: "BK-OLD-4",
  customerId: null,
  customerName: "Dan Cruz",
  serviceName: "Haircut",
  serviceDurationMin: 30,
  staffId: null,
  staffName: null,
  startAt: at("13T14:00").toISOString(),
  endAt: at("13T14:30").toISOString(),
  status: "confirmed",
  notes: null,
  isWalkIn: true,
  expiresAt: null,
});

const staff = [
  { userId: "st-1", name: "Staff Anna", role: "staff" },
  { userId: "st-2", name: "Staff Bob", role: "staff" },
];

function renderInbox(bookings: BookingListItem[] = [request, confirmed, completed, unmarked]) {
  return render(
    <BookingInbox
      shopId={shopId}
      initialBookings={bookings}
      shopStaff={staff}
      renderedAt={at("15T09:30").toISOString()}
    />,
  );
}

const tab = (name: RegExp) => screen.getByRole("tab", { name });

describe("BookingInbox", () => {
  it("opens on requests when one waits, with a count on each view", () => {
    renderInbox();

    expect(screen.getByRole("heading", { level: 1, name: "Booking inbox" })).toBeInTheDocument();
    expect(
      screen.getByText("1 request to answer · 1 confirmed booking coming up"),
    ).toBeInTheDocument();
    expect(tab(/^Requests 1$/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/^Upcoming 2$/)).toHaveAttribute("aria-selected", "false");
    expect(tab(/^Past 1$/)).toBeInTheDocument();

    expect(screen.getByText("Alice Guo")).toBeInTheDocument();
    expect(screen.queryByText("Bob Ong")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Today/ })).toHaveTextContent("TodaySun, Nov 15");
    expect(screen.getByText("Answer within 30 min")).toBeInTheDocument();
  });

  it("opens on upcoming when no request waits", () => {
    renderInbox([confirmed, completed]);
    expect(tab(/^Upcoming/)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Bob Ong")).toBeInTheDocument();
  });

  it("puts confirmed bookings from before today first, to be marked", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.click(tab(/^Upcoming/));
    });

    const groups = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(groups).toEqual(["Still to mark", "TodaySun, Nov 15"]);
    expect(screen.getByText("Dan Cruz")).toBeInTheDocument();
    expect(screen.getByText("Bob Ong")).toBeInTheDocument();
  });

  it("offers Mark done only once a booking has started", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.click(tab(/^Upcoming/));
    });

    // Bob's 12:00 booking hasn't started at 9:30; Dan's from Friday has.
    expect(screen.getAllByRole("button", { name: "Mark done" })).toHaveLength(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    });
    expect(completeBooking).toHaveBeenCalledWith({ bookingId: "b-4" });
    expect(screen.getByRole("status")).toHaveTextContent("Marked Dan Cruz's Haircut done.");
  });

  it("marks a no-show", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.click(tab(/^Upcoming/));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "No-show" }));
    });
    expect(markNoShow).toHaveBeenCalledWith({ bookingId: "b-4" });
  });

  it("accepts a request and says who is booked", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });
    expect(acceptBooking).toHaveBeenCalledWith({ bookingId: "b-1" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Accepted. Alice Guo is booked for Sun, Nov 15 at 10:00 AM.",
    );
  });

  it("shows the server's message when an action fails", async () => {
    vi.mocked(acceptBooking).mockResolvedValueOnce({
      ok: false,
      code: "conflict",
      message: "That time was just taken.",
    } as never);
    renderInbox();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("That time was just taken.");
  });

  it("searches across views and points to the view with matches", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Search bookings"), { target: { value: "color" } });
    });

    expect(tab(/^Requests 0$/)).toBeInTheDocument();
    expect(tab(/^Upcoming 1$/)).toBeInTheDocument();
    expect(screen.getByText("No requests match “color”")).toBeInTheDocument();
    expect(screen.getByText("1 booking matches in Upcoming.")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "See upcoming" }));
    });
    expect(screen.getByText("Bob Ong")).toBeInTheDocument();
  });

  it("finds a booking by its code and filters by team member", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.click(tab(/^Upcoming/));
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Team member"), { target: { value: "none" } });
    });
    expect(screen.getByText("Dan Cruz")).toBeInTheDocument();
    expect(screen.queryByText("Bob Ong")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Team member"), { target: { value: "all" } });
      fireEvent.change(screen.getByLabelText("Search bookings"), {
        target: { value: "bk-conf" },
      });
    });
    expect(screen.getByText("Bob Ong")).toBeInTheDocument();
    expect(screen.queryByText("Dan Cruz")).not.toBeInTheDocument();
  });

  it("moves between views with the arrow keys", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.keyDown(tab(/^Requests/), { key: "ArrowRight" });
    });
    expect(tab(/^Upcoming/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/^Upcoming/)).toHaveFocus();
    await act(async () => {
      fireEvent.keyDown(tab(/^Upcoming/), { key: "End" });
    });
    expect(tab(/^Past/)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Carla Reyes")).toBeInTheDocument();
  });

  it("links to the chat for customers with an account, not for walk-ins", async () => {
    renderInbox();
    expect(screen.getByRole("link", { name: "Message Alice Guo" })).toHaveAttribute(
      "href",
      "/dashboard/bookings/b-1",
    );
    await act(async () => {
      fireEvent.click(tab(/^Upcoming/));
    });
    expect(screen.queryByRole("link", { name: "Message Dan Cruz" })).not.toBeInTheDocument();
  });

  it("opens the booking's details from its row", async () => {
    renderInbox();
    await act(async () => {
      fireEvent.click(screen.getByText("Alice Guo"));
    });
    const dialog = screen.getByRole("dialog", { name: "Spa Treatment" });
    expect(within(dialog).getByText("BK-REQ-1")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Message Alice/ })).toBeInTheDocument();
  });

  it("says when the shop has no bookings yet", () => {
    renderInbox([]);
    expect(screen.getByRole("heading", { name: "No bookings yet" })).toBeInTheDocument();
  });
});
