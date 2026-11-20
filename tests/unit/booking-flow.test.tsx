// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getOpenSlots } from "@/features/availability/actions";
import type { SlotDay } from "@/features/availability/slots";
import {
  BookingFlow,
  missingStep,
  type FlowService,
} from "@/features/bookings/components/customer/booking-flow";
import { groupByPeriod } from "@/features/bookings/components/customer/slot-picker";
import { createBooking, joinQueue } from "@/features/bookings/customer-actions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/analytics/hooks", () => ({
  useBookingFunnelTracker: () => ({ trackStep: vi.fn() }),
}));
vi.mock("@/features/availability/actions", () => ({ getOpenSlots: vi.fn() }));
vi.mock("@/features/bookings/customer-actions", () => ({
  createBooking: vi.fn(),
  joinQueue: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const slot = (startAt: string, label: string, hour: number) => ({
  startAt,
  endAt: startAt,
  remaining: 1,
  staffIds: [],
  label,
  hour,
});

const DAYS: SlotDay[] = [
  { date: "2026-11-20", label: "Fri, Nov 20", slots: [] },
  {
    date: "2026-11-21",
    label: "Sat, Nov 21",
    slots: [
      slot("2026-11-21T01:00:00.000Z", "9:00 AM", 9),
      slot("2026-11-21T05:00:00.000Z", "1:00 PM", 13),
      slot("2026-11-21T10:00:00.000Z", "6:00 PM", 18),
    ],
  },
];

const service = (overrides: Partial<FlowService> = {}): FlowService => ({
  id: "svc-1",
  name: "Full grooming",
  bookingType: "slot",
  priceLabel: "From ₱790",
  durationMin: 90,
  shopName: "Paw-some Grooming",
  staff: [],
  waiting: 0,
  depositLabel: null,
  cancelNote: "Free to cancel up to 2 hours before.",
  ...overrides,
});

async function renderFlow(overrides: Partial<FlowService> = {}, signedIn = true) {
  vi.mocked(getOpenSlots).mockResolvedValue({ ok: true, data: { days: DAYS } });
  await act(async () => {
    render(
      <BookingFlow
        service={service(overrides)}
        today="2026-11-20"
        signedIn={signedIn}
        savedAddresses={[]}
      />,
    );
  });
}

describe("missingStep", () => {
  it("names the next thing each booking type needs", () => {
    const base = { hasSlot: false, address: "", notes: "" };
    expect(missingStep({ ...base, bookingType: "queue" })).toBeNull();
    expect(missingStep({ ...base, bookingType: "slot" })).toBe("Pick a time");
    expect(missingStep({ ...base, bookingType: "quote" })).toBe("Pick a preferred time");
    expect(missingStep({ ...base, bookingType: "slot", hasSlot: true })).toBeNull();
    expect(missingStep({ ...base, bookingType: "home", hasSlot: true, address: "  " })).toBe(
      "Add your address",
    );
    expect(missingStep({ ...base, bookingType: "quote", hasSlot: true })).toBe("Describe the job");
  });
});

describe("groupByPeriod", () => {
  it("splits times into morning, afternoon and evening by Manila hour, skipping empty parts", () => {
    const groups = groupByPeriod(DAYS[1]!.slots);
    expect(groups.map((group) => [group.name, group.slots.map((s) => s.label)])).toEqual([
      ["Morning", ["9:00 AM"]],
      ["Afternoon", ["1:00 PM"]],
      ["Evening", ["6:00 PM"]],
    ]);
    expect(groupByPeriod([DAYS[1]!.slots[0]!]).map((group) => group.name)).toEqual(["Morning"]);
  });
});

describe("BookingFlow", () => {
  it("opens on the first day with times, labels today, and books the picked time", async () => {
    vi.mocked(createBooking).mockResolvedValue({ ok: true, data: { bookingId: "bk-1" } } as never);
    await renderFlow();

    const today = screen.getByRole("button", { name: /Fri, Nov 20, no open times/ });
    expect(today).toBeDisabled();
    expect(today).toHaveTextContent("Today");
    expect(screen.getByRole("button", { name: /Sat, Nov 21, 3 open times/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("group", { name: "Evening times on Sat, Nov 21" })).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Book na" });
    expect(submit).toBeDisabled();
    expect(screen.getByText("Pick a time")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1:00 PM" }));
    expect(screen.getByRole("button", { name: "1:00 PM" })).toHaveAttribute("aria-pressed", "true");
    expect(submit).toBeEnabled();
    expect(screen.getByText("1:00 PM · From ₱790")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(submit);
    });
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "svc-1",
        startAt: "2026-11-21T05:00:00.000Z",
        staffId: null,
        address: null,
      }),
    );
    expect(push).toHaveBeenCalledWith("/account/bookings/bk-1?new=1");
  });

  it("clears a taken time, reloads open times and shows why", async () => {
    vi.mocked(createBooking).mockResolvedValue({
      ok: false,
      code: "CONFLICT",
      message: "Someone just took that time. Pick another.",
    } as never);
    await renderFlow();
    fireEvent.click(screen.getByRole("button", { name: "9:00 AM" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Book na" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Someone just took that time");
    expect(getOpenSlots).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Book na" })).toBeDisabled();
  });

  it("asks home bookings for an address before sending", async () => {
    await renderFlow({ bookingType: "home" });
    fireEvent.click(screen.getByRole("button", { name: "9:00 AM" }));
    expect(screen.getByText("Add your address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book na" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Where should they go?"), {
      target: { value: "12 Mabini St., Concepcion Uno, Marikina" },
    });
    expect(screen.getByRole("button", { name: "Book na" })).toBeEnabled();
  });

  it("needs a description for a quote and never shows a price", async () => {
    await renderFlow({ bookingType: "quote", priceLabel: "Get a quote" });
    fireEvent.click(screen.getByRole("button", { name: "9:00 AM" }));
    expect(screen.getByText("Describe the job")).toBeInTheDocument();
    expect(screen.getByText("Price by quote")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("What do you need done?"), {
      target: { value: "2 split-type aircons" },
    });
    expect(screen.getByRole("button", { name: "Ask for a quote" })).toBeEnabled();
  });

  it("joins the queue without a time, showing how many are waiting", async () => {
    vi.mocked(joinQueue).mockResolvedValue({ ok: true, data: { bookingId: "bk-q" } } as never);
    await renderFlow({ bookingType: "queue", waiting: 3, priceLabel: "₱190" });

    expect(getOpenSlots).not.toHaveBeenCalled();
    const queue = screen.getByRole("region", { name: /Today's queue/ });
    expect(within(queue).getByText("3")).toBeInTheDocument();
    expect(within(queue).getByText("people waiting now")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Get a queue number" }));
    });
    expect(joinQueue).toHaveBeenCalledWith(expect.objectContaining({ serviceId: "svc-1" }));
    expect(push).toHaveBeenCalledWith("/account/bookings/bk-q?new=1");
  });

  it("sends guests to log in and back to this service", async () => {
    await renderFlow({}, false);
    expect(screen.getByRole("link", { name: "Log in to book" })).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent("/book/svc-1")}`,
    );
    expect(screen.queryByRole("button", { name: "Book na" })).not.toBeInTheDocument();
  });

  it("shows an error with a retry when open times fail to load", async () => {
    vi.mocked(getOpenSlots)
      .mockResolvedValueOnce({
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many tries.",
      } as never)
      .mockResolvedValueOnce({ ok: true, data: { days: DAYS } });
    await act(async () => {
      render(<BookingFlow service={service()} today="2026-11-20" signedIn savedAddresses={[]} />);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Too many tries.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(screen.getByRole("button", { name: "9:00 AM" })).toBeInTheDocument();
  });
});
