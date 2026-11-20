// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  // Only Date: the clock hook reads Date.now(); real timers keep the dialogs working.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T04:00:00Z") });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
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

  // Noon in Manila on the day of both walk-ins.
  const nowIso = "2026-11-15T04:00:00Z";
  const renderManager = (walkIns = mockWalkIns) =>
    render(
      <WalkInsManager
        shopId={shopId}
        initialWalkIns={walkIns}
        activeServices={services}
        shopStaff={staff}
        nowIso={nowIso}
      />,
    );

  it("sums today's walk-ins, who is being served and what was earned", () => {
    renderManager();

    const stat = (label: string) =>
      screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;
    expect(stat("Walk-ins today")).toBe("2");
    expect(stat("Being served")).toBe("1");
    expect(stat("Earned today")).toBe("₱150");
  });

  it("lists the guest being served with how long they've been in", () => {
    renderManager();

    const serving = screen.getByRole("region", { name: "Being served" });
    expect(within(serving).getByText("Mang Tomas")).toBeInTheDocument();
    expect(within(serving).getByText(/2 h/)).toBeInTheDocument();
    expect(within(serving).queryByText("Kuya Cardo")).not.toBeInTheDocument();
  });

  it("never shows the packed guest text from the notes", () => {
    renderManager();
    expect(screen.queryByText(/Walk-in: Mang Tomas/)).not.toBeInTheDocument();
  });

  it("filters the history by search and by status", async () => {
    renderManager();
    const history = screen.getByRole("region", { name: "All walk-ins" });
    expect(within(history).getByText("Mang Tomas")).toBeInTheDocument();
    expect(within(history).getByText("Kuya Cardo")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox", { name: "Search walk-ins" }), {
        target: { value: "Cardo" },
      });
    });
    expect(within(history).queryByText("Mang Tomas")).not.toBeInTheDocument();
    expect(within(history).getByText("Kuya Cardo")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
      fireEvent.click(within(history).getByRole("button", { name: /^Done/ }));
    });
    expect(within(history).queryByText("Mang Tomas")).not.toBeInTheDocument();
    expect(within(history).getByText("Kuya Cardo")).toBeInTheDocument();
  });

  it("marks a walk-in done", async () => {
    renderManager();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    });

    expect(completeBooking).toHaveBeenCalledWith({ bookingId: "w-1" });
  });

  it("says so when marking done fails", async () => {
    vi.mocked(completeBooking).mockResolvedValueOnce({
      ok: false,
      code: "CONFLICT",
      message: "This booking just changed. Please refresh and try again.",
    });
    renderManager();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("This booking just changed");
  });

  it("opens a clean Add walk-in form every time", async () => {
    renderManager();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add walk-in" }));
    });
    const dialog = screen.getByRole("dialog", { name: "Add walk-in" });
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText(/Customer name/), {
        target: { value: "Aling Nena" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add walk-in" }));
    });
    expect(screen.getByLabelText(/Customer name/)).toHaveValue("");
  });

  it("invites the shop to add the first walk-in", () => {
    renderManager([]);
    expect(screen.getByText("No walk-ins yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add walk-in" })).toHaveLength(2);
  });
});
