// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardMobileNav, DashboardSubNav } from "@/features/shops/components/dashboard-nav";

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

afterEach(() => {
  cleanup();
});

describe("DashboardNav components", () => {
  it("highlights Today as active when on /dashboard", () => {
    mockPathname = "/dashboard";
    render(<DashboardSubNav />);

    const todayLink = screen.getByRole("link", { name: /Today/i });
    expect(todayLink).toHaveClass("bg-green-100/70", "text-green-800");

    const inboxLink = screen.getByRole("link", { name: /Inbox/i });
    expect(inboxLink).toHaveClass("text-neutral-600");
  });

  it("highlights Inbox when on /dashboard/inbox", () => {
    mockPathname = "/dashboard/inbox";
    render(<DashboardSubNav />);

    const inboxLink = screen.getByRole("link", { name: /Inbox/i });
    expect(inboxLink).toHaveClass("bg-green-100/70", "text-green-800");

    const todayLink = screen.getByRole("link", { name: /Today/i });
    expect(todayLink).toHaveClass("text-neutral-600");
  });

  it("highlights Calendar when on /dashboard/calendar", () => {
    mockPathname = "/dashboard/calendar";
    render(<DashboardSubNav />);

    const calendarLink = screen.getByRole("link", { name: /Calendar/i });
    expect(calendarLink).toHaveClass("bg-green-100/70", "text-green-800");
  });

  it("highlights Walk-ins when on /dashboard/walk-ins", () => {
    mockPathname = "/dashboard/walk-ins";
    render(<DashboardSubNav />);

    const walkInsLink = screen.getByRole("link", { name: /Walk-ins/i });
    expect(walkInsLink).toHaveClass("bg-green-100/70", "text-green-800");
  });

  it("highlights Staff Accounts when on /dashboard/staff", () => {
    mockPathname = "/dashboard/staff";
    render(<DashboardSubNav />);

    const staffLink = screen.getByRole("link", { name: /Staff Accounts/i });
    expect(staffLink).toHaveClass("bg-green-100/70", "text-green-800");
  });

  it("highlights Revenue & Stats when on /dashboard/reports", () => {
    mockPathname = "/dashboard/reports";
    render(<DashboardSubNav />);

    const reportsLink = screen.getByRole("link", { name: /Revenue & Stats/i });
    expect(reportsLink).toHaveClass("bg-green-100/70", "text-green-800");
  });

  it("renders mobile navigation bar with active state indicator", () => {
    mockPathname = "/dashboard/reports";
    render(<DashboardMobileNav />);

    const reportsLink = screen.getByRole("link", { name: /Reports/i });
    expect(reportsLink).toHaveClass("text-green-700");
  });
});
