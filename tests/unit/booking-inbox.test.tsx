// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BookingInbox component", () => {
  const shopId = "00000000-0000-0000-0000-000000000001";
  const staff = [
    { userId: "st-1", name: "Staff Anna", role: "staff" },
    { userId: "st-2", name: "Staff Bob", role: "staff" },
  ];

  const mockBookings: BookingListItem[] = [
    {
      id: "b-1",
      refCode: "BK-REQ-1",
      customerId: "c-1",
      customerName: "Alice Guo",
      customerPhone: "09170001111",
      shopId,
      serviceId: "srv-1",
      serviceName: "Spa Treatment",
      serviceDurationMin: 60,
      staffId: "st-1",
      staffName: "Staff Anna",
      startAt: "2026-11-15T02:00:00Z",
      endAt: "2026-11-15T03:00:00Z",
      status: "requested",
      address: null,
      notes: "First time client",
      quotedPriceCentavos: null,
      totalCentavos: 50000,
      isWalkIn: false,
      createdAt: "2026-11-15T01:00:00Z",
    },
    {
      id: "b-2",
      refCode: "BK-CONF-2",
      customerId: "c-2",
      customerName: "Bob Ong",
      customerPhone: "09170002222",
      shopId,
      serviceId: "srv-2",
      serviceName: "Hair Color",
      serviceDurationMin: 90,
      staffId: "st-2",
      staffName: "Staff Bob",
      startAt: "2026-11-15T04:00:00Z",
      endAt: "2026-11-15T05:30:00Z",
      status: "confirmed",
      address: null,
      notes: null,
      quotedPriceCentavos: null,
      totalCentavos: 80000,
      isWalkIn: false,
      createdAt: "2026-11-15T01:00:00Z",
    },
  ];

  it("renders status tabs with correct counts", () => {
    render(<BookingInbox shopId={shopId} initialBookings={mockBookings} shopStaff={staff} />);

    expect(screen.getByText("All (2)")).toBeInTheDocument();
    expect(screen.getByText("Pending Requests (1)")).toBeInTheDocument();
    expect(screen.getByText("Confirmed (1)")).toBeInTheDocument();
    expect(screen.getByText("Completed (0)")).toBeInTheDocument();
  });

  it("filters bookings when clicking a status tab", async () => {
    render(<BookingInbox shopId={shopId} initialBookings={mockBookings} shopStaff={staff} />);

    expect(screen.getByText("Alice Guo")).toBeInTheDocument();
    expect(screen.getByText("Bob Ong")).toBeInTheDocument();

    const pendingTab = screen.getByText("Pending Requests (1)");
    await act(async () => {
      fireEvent.click(pendingTab);
    });

    expect(screen.getByText("Alice Guo")).toBeInTheDocument();
    expect(screen.queryByText("Bob Ong")).not.toBeInTheDocument();
  });

  it("filters bookings by search query", async () => {
    render(<BookingInbox shopId={shopId} initialBookings={mockBookings} shopStaff={staff} />);

    const searchInput = screen.getByPlaceholderText(/Search ref code, customer, service/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Color" } });
    });

    expect(screen.queryByText("Alice Guo")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Ong")).toBeInTheDocument();
  });

  it("accepts a pending booking when clicking Accept", async () => {
    render(<BookingInbox shopId={shopId} initialBookings={mockBookings} shopStaff={staff} />);

    const acceptBtn = screen.getByRole("button", { name: /^Accept$/i });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(acceptBooking).toHaveBeenCalledWith({ bookingId: "b-1" });
  });

  it("completes a confirmed booking when clicking Done", async () => {
    render(<BookingInbox shopId={shopId} initialBookings={mockBookings} shopStaff={staff} />);

    const doneBtn = screen.getByRole("button", { name: /Done/i });
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    expect(completeBooking).toHaveBeenCalledWith({ bookingId: "b-2" });
  });

  it("marks a confirmed booking as no-show", async () => {
    render(<BookingInbox shopId={shopId} initialBookings={mockBookings} shopStaff={staff} />);

    const noShowBtn = screen.getByTitle("Mark customer as No-show");
    await act(async () => {
      fireEvent.click(noShowBtn);
    });

    expect(markNoShow).toHaveBeenCalledWith({ bookingId: "b-2" });
  });
});
