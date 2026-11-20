// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acceptBooking, completeBooking, markNoShow } from "@/features/bookings/actions";
import { TodayView } from "@/features/bookings/components/today-view";
import type {
  BookingListItem,
  TodayDashboardData,
  TodayHours,
} from "@/features/bookings/constants";
import { setAcceptingToday } from "@/features/shops/actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/bookings/actions", () => ({
  acceptBooking: vi.fn().mockResolvedValue({ ok: true }),
  completeBooking: vi.fn().mockResolvedValue({ ok: true }),
  markNoShow: vi.fn().mockResolvedValue({ ok: true }),
  addWalkIn: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/features/shops/actions", () => ({
  setAcceptingToday: vi.fn().mockResolvedValue({ ok: true }),
}));

const shopId = "00000000-0000-0000-0000-000000000001";

// Sunday, November 15, 2026 in Manila (UTC+8): 9:30 AM unless a test moves the clock.
const at = (manilaTime: string) => new Date(`2026-11-15T${manilaTime}:00+08:00`);

function booking(overrides: Partial<BookingListItem>): BookingListItem {
  return {
    id: "b",
    refCode: "BK-0001",
    customerId: "c-1",
    customerName: "Maria Santos",
    customerPhone: "09171234567",
    shopId,
    serviceId: "srv-1",
    serviceName: "Blowdry",
    serviceDurationMin: 45,
    staffId: null,
    staffName: null,
    startAt: at("10:00").toISOString(),
    endAt: at("10:45").toISOString(),
    status: "requested",
    address: null,
    notes: null,
    quotedPriceCentavos: null,
    totalCentavos: 30000,
    isWalkIn: false,
    createdAt: at("08:00").toISOString(),
    expiresAt: at("10:00").toISOString(),
    bookingType: "slot",
    ...overrides,
  };
}

const request = booking({ id: "b-req", refCode: "BK-REQ-101" });
const confirmed = booking({
  id: "b-conf",
  refCode: "BK-CONF-102",
  customerName: "Juan Luna",
  customerPhone: "09177654321",
  serviceName: "Haircut",
  serviceDurationMin: 30,
  staffId: "st-1",
  staffName: "Staff Leo",
  startAt: at("12:00").toISOString(),
  endAt: at("12:30").toISOString(),
  status: "confirmed",
  expiresAt: null,
});

function makeData(bookings: BookingListItem[]): TodayDashboardData {
  const count = (status: string) => bookings.filter((b) => b.status === status).length;
  return {
    todayDateFormatted: "Sunday, November 15, 2026",
    isAcceptingToday: true,
    stats: {
      total: bookings.length,
      requested: count("requested"),
      confirmed: count("confirmed"),
      completed: count("completed"),
      noShow: count("no_show"),
      cancelled: count("cancelled"),
      walkIns: bookings.filter((b) => b.isWalkIn).length,
      realizedCentavos: 0,
      expectedCentavos: 0,
      totalCentavos: 0,
    },
    todayBookings: bookings,
    pendingRequests: bookings.filter((b) => b.status === "requested"),
    activeServices: [
      { id: "srv-1", name: "Blowdry", priceCentavos: 30000, durationMin: 45 },
      { id: "srv-2", name: "Haircut", priceCentavos: 30000, durationMin: 30 },
    ],
    shopStaff: [{ userId: "st-1", name: "Staff Leo", role: "staff" }],
  };
}

const hours: TodayHours = {
  opensAt: at("09:00").toISOString(),
  closesAt: at("19:00").toISOString(),
  breakStartAt: null,
  breakEndAt: null,
  closedReason: null,
};

function renderToday(
  bookings: BookingListItem[] = [request, confirmed],
  props: Partial<React.ComponentProps<typeof TodayView>> = {},
) {
  return render(
    <TodayView
      shopId={shopId}
      data={makeData(bookings)}
      hours={hours}
      shopSlug={null}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("09:30"));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("TodayView", () => {
  it("shows the date, today's hours and the day's totals", () => {
    renderToday();

    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Sunday, November 15")).toBeInTheDocument();
    expect(screen.getByText("Open until 7:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today so far" })).toBeInTheDocument();
    expect(screen.getByText("0 of 2 bookings done")).toBeInTheDocument();
    expect(screen.getByText("Still to come")).toBeInTheDocument();
  });

  it("says when the shop is closed today", () => {
    renderToday([], { hours: { ...hours, closedReason: "Holiday" } });
    expect(screen.getByText("Closed today: Holiday")).toBeInTheDocument();
  });

  it("switches taking bookings off", async () => {
    renderToday();

    const toggle = screen.getByRole("switch", { name: "Take new bookings today" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(setAcceptingToday).toHaveBeenCalledWith({ shopId, accepting: false });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("lists requests with the time left to answer, and accepts one", async () => {
    renderToday();

    const panel = screen.getByRole("region", { name: /Requests to answer/ });
    expect(within(panel).getByText("Answer within 30 min")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Accept" }));
    });
    expect(acceptBooking).toHaveBeenCalledWith({ bookingId: "b-req" });
  });

  it("offers a quote instead of Accept for a quote request", () => {
    renderToday([booking({ id: "b-quote", bookingType: "quote", totalCentavos: null })]);

    const panel = screen.getByRole("region", { name: /Requests to answer/ });
    expect(within(panel).getByRole("link", { name: "Send a quote" })).toHaveAttribute(
      "href",
      "/dashboard/quotes",
    );
    expect(within(panel).queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("shows the next confirmed booking with a call button, and Mark done only once it starts", () => {
    renderToday();

    const upNext = screen.getByRole("region", { name: "Up next" });
    expect(within(upNext).getByText("Starts in 2 h 30 min")).toBeInTheDocument();
    expect(within(upNext).getByText("Haircut")).toBeInTheDocument();
    expect(within(upNext).getByRole("link", { name: "Call Juan" })).toHaveAttribute(
      "href",
      "tel:09177654321",
    );
    expect(within(upNext).queryByRole("button", { name: "Mark done" })).not.toBeInTheDocument();
  });

  it("marks the booking in progress done, and allows a no-show only after 15 minutes", async () => {
    vi.setSystemTime(at("12:10"));
    renderToday();

    const upNext = screen.getByRole("region", { name: "Up next" });
    expect(within(upNext).getByText("In progress")).toBeInTheDocument();
    expect(
      within(upNext).queryByRole("button", { name: "Mark as no-show" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(upNext).getByRole("button", { name: "Mark done" }));
    });
    expect(completeBooking).toHaveBeenCalledWith({ bookingId: "b-conf" });
  });

  it("marks a no-show from 15 minutes after the start", async () => {
    vi.setSystemTime(at("12:20"));
    renderToday([confirmed]);

    const upNext = screen.getByRole("region", { name: "Up next" });
    await act(async () => {
      fireEvent.click(within(upNext).getByRole("button", { name: "Mark as no-show" }));
    });
    expect(markNoShow).toHaveBeenCalledWith({ bookingId: "b-conf" });
  });

  it("shows the server's message when an action fails", async () => {
    vi.mocked(acceptBooking).mockResolvedValueOnce({
      ok: false,
      code: "CONFLICT",
      message: "That time was just taken.",
    });
    renderToday();

    const panel = screen.getByRole("region", { name: /Requests to answer/ });
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Accept" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("That time was just taken.");
  });

  it("opens the walk-in form", async () => {
    renderToday();

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Add walk-in" })[0]!);
    });
    expect(screen.getByRole("heading", { name: "Add walk-in" })).toBeInTheDocument();
  });

  it("filters the schedule and draws the Now line between past and upcoming", async () => {
    vi.setSystemTime(at("11:00"));
    const done = booking({
      id: "b-done",
      serviceName: "Shave",
      customerName: "Ana Cruz",
      startAt: at("09:00").toISOString(),
      endAt: at("09:30").toISOString(),
      status: "completed",
    });
    renderToday([done, confirmed]);

    const schedule = screen.getByRole("region", { name: /Schedule/ });
    const rows = within(schedule).getAllByRole("listitem");
    const nowIndex = rows.findIndex((row) => row.getAttribute("aria-label") === "Current time");
    expect(nowIndex).toBe(1); // after the 9:00 booking, before the 12:00 one

    await act(async () => {
      fireEvent.click(within(schedule).getByRole("button", { name: /To do/ }));
    });
    expect(within(schedule).getByText("Haircut")).toBeInTheDocument();
    expect(within(schedule).queryByText("Shave")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(schedule).getByRole("button", { name: /Walk-ins/ }));
    });
    expect(within(schedule).getByText("No walk-ins yet today.")).toBeInTheDocument();
  });

  it("shows an empty day with a walk-in button and the shop page link", () => {
    renderToday([], { shopSlug: "kuya-juns" });

    const schedule = screen.getByRole("region", { name: /Schedule/ });
    expect(within(schedule).getByText("No bookings yet today")).toBeInTheDocument();
    expect(within(schedule).getByRole("link", { name: "Open your shop page" })).toHaveAttribute(
      "href",
      "/shop/kuya-juns",
    );
    expect(
      within(screen.getByRole("region", { name: "Up next" })).getByText(/Nothing booked yet/),
    ).toBeInTheDocument();
  });
});
