// @vitest-environment jsdom
import type * as React from "react";
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

  const renderCalendar = (props: Partial<React.ComponentProps<typeof BookingCalendar>> = {}) =>
    render(
      <BookingCalendar
        shopId={shopId}
        initialBookings={mockBookings}
        activeServices={services}
        shopStaff={[staff1, staff2]}
        {...props}
      />,
    );

  it("opens on the week and switches to the month", async () => {
    renderCalendar();

    expect(screen.getByRole("button", { name: "Week", pressed: true })).toBeInTheDocument();
    // The week grid and the phone's day column both draw the booking.
    expect(screen.getAllByRole("button", { name: /Haircut for Juan Dela Cruz/ }).length).toBe(2);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Month" }));
    });

    expect(screen.getByRole("button", { name: "Month", pressed: true })).toBeInTheDocument();
    // The chosen day (today) lists its bookings beside the month.
    expect(screen.getByRole("heading", { name: /Today/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Haircut\s*Juan Dela Cruz/ })).toBeInTheDocument();
  });

  it("filters bookings by team member", async () => {
    renderCalendar();

    expect(screen.getAllByRole("button", { name: /Walk-in Guest/ }).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Show bookings for" }), {
        target: { value: "staff-1" },
      });
    });

    expect(screen.getAllByRole("button", { name: /Juan Dela Cruz/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Walk-in Guest/ })).not.toBeInTheDocument();
  });

  it("hides cancelled bookings until asked", async () => {
    const cancelled = {
      ...mockBookings[0]!,
      id: "b-3",
      customerName: "Ana Reyes",
      status: "cancelled" as const,
    };
    renderCalendar({ initialBookings: [...mockBookings, cancelled] });

    expect(screen.queryByRole("button", { name: /Ana Reyes/ })).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Show cancelled/ }));
    });
    expect(screen.getAllByRole("button", { name: /Ana Reyes.*Cancelled/ }).length).toBeGreaterThan(
      0,
    );
  });

  it("says how many requests wait for an answer", () => {
    renderCalendar();
    expect(screen.getByRole("link", { name: "1 waiting for your answer" })).toHaveAttribute(
      "href",
      "/dashboard/inbox",
    );
  });

  it("shows the empty state for a week without bookings", () => {
    renderCalendar({ initialBookings: [] });
    expect(screen.getByText(/No bookings this week yet/)).toBeInTheDocument();
  });

  it("opens the walk-in form from Add walk-in", async () => {
    renderCalendar();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add walk-in" }));
    });

    expect(screen.getByRole("heading", { name: "Add walk-in" })).toBeInTheDocument();
  });
});
