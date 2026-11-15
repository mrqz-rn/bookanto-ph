// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BookingCalendar } from "@/features/bookings/components/booking-calendar";
import type { BookingListItem } from "@/features/bookings/constants";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BookingCalendar component", () => {
  const shopId = "00000000-0000-0000-0000-000000000001";
  const staff1 = { userId: "staff-1", name: "Staff Maria", role: "staff" };
  const staff2 = { userId: "staff-2", name: "Staff Carlo", role: "staff" };

  const services = [{ id: "srv-1", name: "Haircut", priceCentavos: 25000, durationMin: 30 }];

  const now = new Date();
  const todayIso = now.toISOString();

  const mockBookings: BookingListItem[] = [
    {
      id: "b-1",
      refCode: "BK-111",
      customerId: "cust-1",
      customerName: "Juan Dela Cruz",
      customerPhone: "09171234567",
      shopId,
      serviceId: "srv-1",
      serviceName: "Haircut",
      serviceDurationMin: 30,
      staffId: "staff-1",
      staffName: "Staff Maria",
      startAt: todayIso,
      endAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
      status: "confirmed",
      address: null,
      notes: null,
      quotedPriceCentavos: null,
      totalCentavos: 25000,
      isWalkIn: false,
      createdAt: todayIso,
    },
    {
      id: "b-2",
      refCode: "BK-222",
      customerId: null,
      customerName: "Walk-in Guest",
      customerPhone: null,
      shopId,
      serviceId: "srv-1",
      serviceName: "Haircut",
      serviceDurationMin: 30,
      staffId: "staff-2",
      staffName: "Staff Carlo",
      startAt: todayIso,
      endAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
      status: "requested",
      address: null,
      notes: null,
      quotedPriceCentavos: null,
      totalCentavos: 25000,
      isWalkIn: true,
      createdAt: todayIso,
    },
  ];

  it("renders Month view by default and displays weekday headers", () => {
    render(
      <BookingCalendar
        shopId={shopId}
        initialBookings={mockBookings}
        activeServices={services}
        shopStaff={[staff1, staff2]}
      />,
    );

    expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week" })).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  it("switches to Week view when clicking the Week button", async () => {
    render(
      <BookingCalendar
        shopId={shopId}
        initialBookings={mockBookings}
        activeServices={services}
        shopStaff={[staff1, staff2]}
      />,
    );

    const weekBtn = screen.getByRole("button", { name: "Week" });
    await act(async () => {
      fireEvent.click(weekBtn);
    });

    // In week view, appointments appear as detailed cards
    expect(screen.getAllByText("Haircut").length).toBeGreaterThan(0);
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
  });

  it("filters appointments by assigned team member", async () => {
    render(
      <BookingCalendar
        shopId={shopId}
        initialBookings={mockBookings}
        activeServices={services}
        shopStaff={[staff1, staff2]}
      />,
    );

    // Switch to Week view to inspect items clearly
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Week" }));
    });

    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("Walk-in Guest")).toBeInTheDocument();

    // Select Staff Maria only
    const select = screen.getByRole("combobox");
    await act(async () => {
      fireEvent.change(select, { target: { value: "staff-1" } });
    });

    // Juan is assigned to staff-1 (Maria)
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    // Walk-in Guest is assigned to staff-2 (Carlo), so filtered out
    expect(screen.queryByText("Walk-in Guest")).not.toBeInTheDocument();
  });

  it("opens walk-in modal when clicking Record Walk-in button", async () => {
    render(
      <BookingCalendar
        shopId={shopId}
        initialBookings={mockBookings}
        activeServices={services}
        shopStaff={[staff1, staff2]}
      />,
    );

    const recordBtn = screen.getByRole("button", { name: /\+ Record Walk-in/i });
    await act(async () => {
      fireEvent.click(recordBtn);
    });

    expect(screen.getByText("Record Walk-in Client")).toBeInTheDocument();
  });
});
