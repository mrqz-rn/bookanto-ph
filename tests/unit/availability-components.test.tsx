// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getOpenSlots, setHours } from "@/features/availability/actions";
import { fromDraft, toDraft } from "@/features/availability/components/hours-draft";
import { ShopHoursForm } from "@/features/availability/components/shop-hours-form";
import { SlotPreview } from "@/features/availability/components/slot-preview";

vi.mock("@/features/availability/actions", () => ({
  setHours: vi.fn(),
  getOpenSlots: vi.fn(),
}));

const SHOP = "8c1f3f7e-2a8a-4f43-9a54-3c1d2f9a0b11";
const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opens: "09:00",
  closes: "18:00",
  breakStart: "12:00",
  breakEnd: "13:00",
}));

// Vitest globals are off, so Testing Library cannot clean up on its own.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("hours drafts", () => {
  it("round-trips saved hours, Monday first, closed days kept as closed", () => {
    const draft = toDraft(weekdays);
    expect(draft.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(draft.find((day) => day.weekday === 0)?.open).toBe(false);
    expect(fromDraft(draft)).toEqual(weekdays);
  });
});

describe("ShopHoursForm", () => {
  it("saves the week and confirms", async () => {
    vi.mocked(setHours).mockResolvedValue({ ok: true, data: { openDays: 5 } });
    render(<ShopHoursForm shopId={SHOP} hours={weekdays} canEdit />);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save hours" })));

    expect(setHours).toHaveBeenCalledWith({ shopId: SHOP, hours: weekdays });
    expect(await screen.findByRole("status")).toHaveTextContent("Open 5 days a week");
  });

  it("flags a break outside opening hours and blocks saving", () => {
    render(<ShopHoursForm shopId={SHOP} hours={weekdays} canEdit />);
    fireEvent.change(screen.getByLabelText("Monday break starts"), { target: { value: "08:00" } });

    expect(screen.getByText(/break must start after opening/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save hours" })).toBeDisabled();
  });

  it("shows the error message when saving fails", async () => {
    vi.mocked(setHours).mockResolvedValue({
      ok: false,
      code: "FORBIDDEN",
      message: "Sorry, you can't do that.",
    });
    render(<ShopHoursForm shopId={SHOP} hours={weekdays} canEdit />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save hours" })));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sorry, you can't do that.");
  });

  it("is read-only for staff", () => {
    render(<ShopHoursForm shopId={SHOP} hours={weekdays} canEdit={false} />);
    expect(screen.queryByRole("button", { name: "Save hours" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Monday opens")).toBeDisabled();
  });
});

describe("SlotPreview", () => {
  const services = [{ id: "svc-1", name: "Haircut", rules: "30 min · 1 per slot" }];
  const day = (date: string, label: string, times: string[]) => ({
    date,
    label,
    slots: times.map((time) => ({
      startAt: `${date}T${time}:00.000Z`,
      endAt: `${date}T${time}:00.000Z`,
      remaining: 1,
      staffIds: [],
      label: time,
    })),
  });

  it("shows open times for the picked day, and an empty state for a full day", async () => {
    vi.mocked(getOpenSlots).mockResolvedValue({
      ok: true,
      data: {
        days: [
          day("2026-12-07", "Mon, Dec 7", ["9:00 AM", "9:30 AM"]),
          day("2026-12-08", "Tue, Dec 8", []),
        ],
      },
    });
    render(<SlotPreview services={services} staff={[]} today="2026-12-07" />);

    expect(await screen.findByRole("list", { name: "Open times on Mon, Dec 7" })).toHaveTextContent(
      "9:00 AM9:30 AM",
    );
    fireEvent.click(screen.getByRole("button", { name: /Tue/ }));
    expect(screen.getByText(/No open times on Tue, Dec 8/)).toBeInTheDocument();
    expect(getOpenSlots).toHaveBeenCalledWith({
      serviceId: "svc-1",
      date: "2026-12-07",
      days: 14,
      staffId: null,
    });
  });

  it("offers a retry when loading fails", async () => {
    vi.mocked(getOpenSlots).mockResolvedValueOnce({
      ok: false,
      code: "INTERNAL",
      message: "Something went wrong on our side. Please try again.",
    });
    vi.mocked(getOpenSlots).mockResolvedValueOnce({ ok: true, data: { days: [] } });
    render(<SlotPreview services={services} staff={[]} today="2026-12-07" />);

    await screen.findByRole("alert");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(getOpenSlots).toHaveBeenCalledTimes(2);
  });

  it("explains what to do when there are no bookable services", () => {
    render(<SlotPreview services={[]} staff={[]} today="2026-12-07" />);
    expect(screen.getByText("No bookable services yet")).toBeInTheDocument();
    expect(getOpenSlots).not.toHaveBeenCalled();
  });
});
