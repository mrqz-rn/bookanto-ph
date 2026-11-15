// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DashboardContentSlot,
  DashboardMobileNav,
  DashboardNavProvider,
  DashboardSubNav,
} from "@/features/shops/components/dashboard-nav";
import { getDashboardSkeletonForPath } from "@/features/shops/components/dashboard-skeletons";

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

  it("optimistically switches active tab and displays target skeleton on click", () => {
    mockPathname = "/dashboard/inbox";
    render(
      <DashboardNavProvider>
        <DashboardSubNav />
        <DashboardContentSlot>
          <div>Current Inbox Content</div>
        </DashboardContentSlot>
      </DashboardNavProvider>,
    );

    expect(screen.getByText("Current Inbox Content")).toBeInTheDocument();

    const calendarLink = screen.getByRole("link", { name: /Calendar/i });
    fireEvent.click(calendarLink);

    // Calendar tab is immediately highlighted
    expect(calendarLink).toHaveClass("bg-green-100/70", "text-green-800");
    // Calendar skeleton is immediately displayed
    expect(screen.getByRole("status", { name: /Loading booking calendar/i })).toBeInTheDocument();
  });

  it("returns matching skeletons for each store dashboard tab route", () => {
    const paths = [
      "/dashboard",
      "/dashboard/inbox",
      "/dashboard/calendar",
      "/dashboard/walk-ins",
      "/dashboard/reviews",
      "/dashboard/staff",
      "/dashboard/reports",
      "/dashboard/services",
      "/dashboard/availability",
      "/dashboard/setup",
      "/dashboard/bookings/123",
    ];

    for (const path of paths) {
      const { unmount } = render(<>{getDashboardSkeletonForPath(path)}</>);
      expect(screen.getByRole("status")).toBeInTheDocument();
      unmount();
    }
  });
});
