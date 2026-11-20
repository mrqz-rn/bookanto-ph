// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DashboardContentSlot,
  DashboardMobileNav,
  DashboardNavProvider,
  DashboardSidebar,
  NAV_GROUPS,
} from "@/features/shops/components/dashboard-nav";
import { getDashboardSkeletonForPath } from "@/features/shops/components/dashboard-skeletons";

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

afterEach(() => {
  cleanup();
});

const shop = { name: "Kuya Jun's Barbershop", status: "active", slug: "kuya-jun-barbershop" };

describe("Dashboard sidebar", () => {
  it.each([
    ["/dashboard", /^Today$/],
    ["/dashboard/inbox", /^Inbox$/],
    ["/dashboard/calendar", /^Calendar$/],
    ["/dashboard/walk-ins", /^Walk-ins$/],
    ["/dashboard/staff", /Staff accounts/i],
    ["/dashboard/reports", /Revenue & stats/i],
    ["/dashboard/services", /Services & prices/i],
  ])("marks the current page on %s", (path, name) => {
    mockPathname = path;
    render(<DashboardSidebar shop={shop} />);

    const current = screen.getByRole("link", { name });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(
      screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page"),
    ).toHaveLength(1);
  });

  it("keeps Today only for the dashboard home, not its sub-pages", () => {
    mockPathname = "/dashboard/inbox";
    render(<DashboardSidebar shop={shop} />);
    expect(screen.getByRole("link", { name: /^Today$/ })).not.toHaveAttribute("aria-current");
  });

  it("lists every page once, in its group, with the shop and its public page", () => {
    mockPathname = "/dashboard";
    render(<DashboardSidebar shop={shop} />);

    for (const group of NAV_GROUPS) {
      const list = screen.getByRole("list", { name: group.label });
      expect(within(list).getAllByRole("link")).toHaveLength(group.items.length);
    }
    expect(screen.getByText("Kuya Jun's Barbershop")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View shop page/i })).toHaveAttribute(
      "href",
      "/shop/kuya-jun-barbershop",
    );
  });

  it("offers shop setup when there is no shop yet", () => {
    mockPathname = "/dashboard";
    render(<DashboardSidebar shop={null} />);
    expect(screen.getByRole("link", { name: /Set up your shop/i })).toHaveAttribute(
      "href",
      "/dashboard/setup",
    );
  });

  it("highlights the clicked page and shows its skeleton before the route loads", () => {
    mockPathname = "/dashboard/inbox";
    render(
      <DashboardNavProvider>
        <DashboardSidebar shop={shop} />
        <DashboardContentSlot>
          <div>Current Inbox Content</div>
        </DashboardContentSlot>
      </DashboardNavProvider>,
    );

    expect(screen.getByText("Current Inbox Content")).toBeInTheDocument();

    const calendarLink = screen.getByRole("link", { name: /^Calendar$/ });
    fireEvent.click(calendarLink);

    expect(calendarLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("status", { name: /Loading booking calendar/i })).toBeInTheDocument();
  });
});

describe("Dashboard bottom bar", () => {
  it("shows the four daily pages and More", () => {
    mockPathname = "/dashboard/calendar";
    render(<DashboardMobileNav shop={shop} />);

    const bar = screen.getByRole("navigation", { name: "Shop dashboard" });
    expect(
      within(bar)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Today", "Inbox", "Calendar", "Walk-ins"]);
    expect(within(bar).getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(bar).getByRole("button", { name: "More" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens every page from More, with the current one marked, and closes on Escape", () => {
    mockPathname = "/dashboard/reports";
    render(<DashboardMobileNav shop={shop} />);

    const more = screen.getByRole("button", { name: "More" });
    fireEvent.click(more);

    const sheet = screen.getByRole("dialog", { name: "All pages" });
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(within(sheet).getByRole("link", { name: /Revenue & stats/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(sheet).getByRole("link", { name: /Booking rules/i })).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: /^Account$/ })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Dashboard skeletons", () => {
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
