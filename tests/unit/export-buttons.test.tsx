// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportButtons } from "@/features/bookings/components/export-buttons";
import type { BookingListItem, ShopRevenueStats } from "@/features/bookings/constants";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExportButtons component", () => {
  const mockStats: ShopRevenueStats = {
    period: "30d",
    periodLabel: "Last 30 Days",
    grossCentavos: 100000,
    completedCount: 2,
    totalBookings: 2,
    averageCentavos: 50000,
    noShowRate: 0,
    completionRate: 100,
    walkInRate: 50,
    dailyTrend: [
      {
        date: "2026-11-15",
        label: "Nov 15",
        bookingsCount: 2,
        grossCentavos: 100000,
      },
    ],
    topServices: [
      {
        serviceId: "s-1",
        serviceName: "Full Grooming",
        bookingsCount: 2,
        grossCentavos: 100000,
        sharePercentage: 100,
      },
    ],
    staffPerformance: [
      {
        staffId: "st-1",
        staffName: "Kuya Bert",
        role: "staff",
        assignedCount: 2,
        completedCount: 2,
        grossCentavos: 100000,
      },
    ],
  };

  const mockBookings: BookingListItem[] = [
    {
      id: "b-1",
      refCode: "BK-001",
      customerId: "c-1",
      customerName: "Juan Dela Cruz",
      customerPhone: "09171234567",
      shopId: "shop-1",
      serviceId: "s-1",
      serviceName: "Full Grooming",
      serviceDurationMin: 45,
      staffId: "st-1",
      staffName: "Kuya Bert",
      startAt: "2026-11-15T02:00:00Z",
      endAt: "2026-11-15T02:45:00Z",
      status: "completed",
      address: null,
      notes: "VIP customer",
      quotedPriceCentavos: null,
      totalCentavos: 50000,
      isWalkIn: false,
      createdAt: "2026-11-15T01:00:00Z",
    },
  ];

  let createdUrls: string[] = [];
  let downloadedBlobs: Blob[] = [];

  beforeEach(() => {
    createdUrls = [];
    downloadedBlobs = [];
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlobs.push(blob);
        const url = `blob:mock-url-${createdUrls.length}`;
        createdUrls.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn(),
    });
  });

  it("renders export buttons including bookings, services, staff, daily trend and print", () => {
    render(<ExportButtons bookings={mockBookings} stats={mockStats} shopName="Kanto Barbers" />);

    expect(screen.getByRole("button", { name: /Bookings \(CSV\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Services \(CSV\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Staff \(CSV\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Daily Trend \(CSV\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print Report/i })).toBeInTheDocument();
  });

  it("triggers Bookings CSV download with properly formatted rows", async () => {
    render(<ExportButtons bookings={mockBookings} stats={mockStats} shopName="Kanto Barbers" />);

    const btn = screen.getByRole("button", { name: /Bookings \(CSV\)/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(createdUrls.length).toBe(1);
    expect(downloadedBlobs.length).toBe(1);

    // Read blob content
    const text = await downloadedBlobs[0]!.text();
    expect(text).toContain("Reference Code");
    expect(text).toContain("BK-001");
    expect(text).toContain("Juan Dela Cruz");
    expect(text).toContain("Full Grooming");
    expect(text).toContain("500.00");
  });

  it("triggers Staff Performance CSV download", async () => {
    render(<ExportButtons bookings={mockBookings} stats={mockStats} shopName="Kanto Barbers" />);

    const btn = screen.getByRole("button", { name: /Staff \(CSV\)/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(createdUrls.length).toBe(1);
    const text = await downloadedBlobs[0]!.text();
    expect(text).toContain("Team Member");
    expect(text).toContain("Kuya Bert");
    expect(text).toContain("1000.00");
    expect(text).toContain("100%");
  });

  it("triggers window.print when Print Report is clicked", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(<ExportButtons bookings={mockBookings} stats={mockStats} shopName="Kanto Barbers" />);

    const printBtn = screen.getByRole("button", { name: /Print Report/i });
    await act(async () => {
      fireEvent.click(printBtn);
    });

    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
