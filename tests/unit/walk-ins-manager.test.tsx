// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { completeBooking } from "@/features/bookings/actions";
import { WalkInsManager } from "@/features/bookings/components/walk-ins-manager";
import type { BookingListItem } from "@/features/bookings/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/bookings/actions", () => ({
  completeBooking: vi.fn().mockResolvedValue({ ok: true }),
  addWalkIn: vi.fn().mockResolvedValue({ ok: true }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WalkInsManager component", () => {
  const shopId = "00000000-0000-0000-0000-000000000001";
  const services = [{ id: "srv-1", name: "Quick Trim", priceCentavos: 15000, durationMin: 20 }];
  const staff = [{ userId: "st-1", name: "Barber Jun", role: "staff" }];

  const mockWalkIns: BookingListItem[] = [
    {
      id: "w-1",
      refCode: "BK-W-001",
      customerId: null,
      customerName: "Mang Tomas",
      customerPhone: "09170001111",
      shopId,
      serviceId: "srv-1",
      serviceName: "Quick Trim",
      serviceDurationMin: 20,
      staffId: "st-1",
      staffName: "Barber Jun",
      startAt: "2026-11-15T02:00:00Z",
      endAt: "2026-11-15T02:20:00Z",
      status: "confirmed",
      address: null,
      notes: "Walk-in: Mang Tomas · 09170001111",
      quotedPriceCentavos: null,
      totalCentavos: 15000,
      isWalkIn: true,
      createdAt: "2026-11-15T01:50:00Z",
    },
    {
      id: "w-2",
      refCode: "BK-W-002",
      customerId: null,
      customerName: "Kuya Cardo",
      customerPhone: null,
      shopId,
      serviceId: "srv-1",
      serviceName: "Quick Trim",
      serviceDurationMin: 20,
      staffId: null,
      staffName: null,
      startAt: "2026-11-15T03:00:00Z",
      endAt: "2026-11-15T03:20:00Z",
      status: "completed",
      address: null,
      notes: "Walk-in: Kuya Cardo",
      quotedPriceCentavos: null,
      totalCentavos: 15000,
      isWalkIn: true,
      createdAt: "2026-11-15T02:50:00Z",
    },
  ];

  it("renders KPI totals correctly", () => {
    render(
      <WalkInsManager
        shopId={shopId}
        initialWalkIns={mockWalkIns}
        activeServices={services}
        shopStaff={staff}
      />,
    );

    expect(screen.getByText("Total Walk-in Visits")).toBeInTheDocument();
    expect(screen.getByText("Completed Visits")).toBeInTheDocument();
    expect(screen.getByText("Walk-in Revenue")).toBeInTheDocument();

    // 2 total, 1 completed, 150 revenue
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("₱150").length).toBeGreaterThanOrEqual(1);
  });

  it("filters walk-ins using search input", async () => {
    render(
      <WalkInsManager
        shopId={shopId}
        initialWalkIns={mockWalkIns}
        activeServices={services}
        shopStaff={staff}
      />,
    );

    expect(screen.getByText("Mang Tomas")).toBeInTheDocument();
    expect(screen.getByText("Kuya Cardo")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search walk-in guest name/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Cardo" } });
    });

    expect(screen.queryByText("Mang Tomas")).not.toBeInTheDocument();
    expect(screen.getByText("Kuya Cardo")).toBeInTheDocument();
  });

  it("completes a walk-in when clicking Done", async () => {
    render(
      <WalkInsManager
        shopId={shopId}
        initialWalkIns={mockWalkIns}
        activeServices={services}
        shopStaff={staff}
      />,
    );

    const doneButton = screen.getByRole("button", { name: /Done/i });
    await act(async () => {
      fireEvent.click(doneButton);
    });

    expect(completeBooking).toHaveBeenCalledWith({ bookingId: "w-1" });
  });

  it("opens modal when clicking + New Walk-in Client", async () => {
    render(
      <WalkInsManager
        shopId={shopId}
        initialWalkIns={mockWalkIns}
        activeServices={services}
        shopStaff={staff}
      />,
    );

    const newBtn = screen.getByRole("button", { name: /\+ New Walk-in Client/i });
    await act(async () => {
      fireEvent.click(newBtn);
    });

    expect(screen.getByText("Record Walk-in Client")).toBeInTheDocument();
  });
});
