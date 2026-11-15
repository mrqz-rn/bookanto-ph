// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { acceptBooking, completeBooking } from "@/features/bookings/actions";
import { TodayView } from "@/features/bookings/components/today-view";
import type { TodayDashboardData } from "@/features/bookings/constants";
import { setAcceptingToday } from "@/features/shops/actions";

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
  addWalkIn: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/features/shops/actions", () => ({
  setAcceptingToday: vi.fn().mockResolvedValue({ ok: true }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TodayView component", () => {
  const shopId = "00000000-0000-0000-0000-000000000001";

  const mockData: TodayDashboardData = {
    todayDateFormatted: "Sunday, November 15, 2026",
    isAcceptingToday: true,
    stats: {
      total: 2,
      requested: 1,
      confirmed: 1,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      walkIns: 0,
      realizedCentavos: 0,
      expectedCentavos: 60000,
      totalCentavos: 60000,
    },
    pendingRequests: [
      {
        id: "b-req",
        refCode: "BK-REQ-101",
        customerId: "c-1",
        customerName: "Maria Santos",
        customerPhone: "09171234567",
        shopId,
        serviceId: "srv-1",
        serviceName: "Blowdry",
        serviceDurationMin: 45,
        staffId: null,
        staffName: null,
        startAt: "2026-11-15T02:00:00Z",
        endAt: "2026-11-15T02:45:00Z",
        status: "requested",
        address: null,
        notes: null,
        quotedPriceCentavos: null,
        totalCentavos: 30000,
        isWalkIn: false,
        createdAt: "2026-11-15T01:00:00Z",
      },
    ],
    todayBookings: [
      {
        id: "b-req",
        refCode: "BK-REQ-101",
        customerId: "c-1",
        customerName: "Maria Santos",
        customerPhone: "09171234567",
        shopId,
        serviceId: "srv-1",
        serviceName: "Blowdry",
        serviceDurationMin: 45,
        staffId: null,
        staffName: null,
        startAt: "2026-11-15T02:00:00Z",
        endAt: "2026-11-15T02:45:00Z",
        status: "requested",
        address: null,
        notes: null,
        quotedPriceCentavos: null,
        totalCentavos: 30000,
        isWalkIn: false,
        createdAt: "2026-11-15T01:00:00Z",
      },
      {
        id: "b-conf",
        refCode: "BK-CONF-102",
        customerId: "c-2",
        customerName: "Juan Luna",
        customerPhone: "09177654321",
        shopId,
        serviceId: "srv-2",
        serviceName: "Haircut",
        serviceDurationMin: 30,
        staffId: "st-1",
        staffName: "Staff Leo",
        startAt: "2026-11-15T04:00:00Z",
        endAt: "2026-11-15T04:30:00Z",
        status: "confirmed",
        address: null,
        notes: null,
        quotedPriceCentavos: null,
        totalCentavos: 30000,
        isWalkIn: false,
        createdAt: "2026-11-15T01:00:00Z",
      },
    ],
    activeServices: [
      { id: "srv-1", name: "Blowdry", priceCentavos: 30000, durationMin: 45 },
      { id: "srv-2", name: "Haircut", priceCentavos: 30000, durationMin: 30 },
    ],
    shopStaff: [{ userId: "st-1", name: "Staff Leo", role: "staff" }],
  };

  it("renders today schedule header and KPIs", () => {
    render(<TodayView shopId={shopId} data={mockData} />);

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Sunday, November 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("Accepting Bookings")).toBeInTheDocument();
    expect(screen.getByText("Total Today")).toBeInTheDocument();
    expect(screen.getByText("Realized Revenue")).toBeInTheDocument();
    expect(screen.getByText("Expected Total")).toBeInTheDocument();
  });

  it("toggles accepting today status when clicking toggle button", async () => {
    render(<TodayView shopId={shopId} data={mockData} />);

    const toggleBtn = screen.getByRole("button", { name: /Accepting Bookings/i });
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(setAcceptingToday).toHaveBeenCalledWith({ shopId, accepting: false });
  });

  it("displays pending requests section and accepts a booking", async () => {
    render(<TodayView shopId={shopId} data={mockData} />);

    expect(screen.getByText(/Pending Booking Requests \(1\)/i)).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: "Accept Booking" });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(acceptBooking).toHaveBeenCalledWith({ bookingId: "b-req" });
  });

  it("completes a confirmed booking when clicking Done", async () => {
    render(<TodayView shopId={shopId} data={mockData} />);

    const doneBtn = screen.getByRole("button", { name: /Done/i });
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    expect(completeBooking).toHaveBeenCalledWith({ bookingId: "b-conf" });
  });

  it("opens walk-in modal when clicking Record Walk-in button", async () => {
    render(<TodayView shopId={shopId} data={mockData} />);

    const recordWalkInBtn = screen.getByRole("button", { name: /\+ Record Walk-in/i });
    await act(async () => {
      fireEvent.click(recordWalkInBtn);
    });

    expect(screen.getByText("Record Walk-in Client")).toBeInTheDocument();
  });

  it("filters today bookings by status tabs", async () => {
    render(<TodayView shopId={shopId} data={mockData} />);

    expect(screen.getAllByText("Maria Santos").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Juan Luna")).toBeInTheDocument();

    // Click Confirmed tab
    const confirmedTab = screen.getByRole("button", { name: /Confirmed \(1\)/i });
    await act(async () => {
      fireEvent.click(confirmedTab);
    });

    expect(screen.getByText("Juan Luna")).toBeInTheDocument();
  });
});
