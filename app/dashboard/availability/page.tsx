import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ClosuresPanel, type ClosureItem } from "@/features/availability/components/closures-panel";
import { HolidayRulesForm } from "@/features/availability/components/holiday-rules-form";
import { Panel } from "@/features/availability/components/panel";
import { ShopHoursForm } from "@/features/availability/components/shop-hours-form";
import { SlotPreview } from "@/features/availability/components/slot-preview";
import { StaffSchedulesPanel } from "@/features/availability/components/staff-schedules-panel";
import { upcomingHolidays } from "@/features/availability/holidays";
import { getAvailabilityDashboard, getMemberShops } from "@/features/availability/queries";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { formatManila, manilaDate, manilaToUtc } from "@/lib/time";

export const metadata: Metadata = {
  title: "Availability",
  description: "Set your shop's hours, breaks, closures, holidays and staff schedules.",
};

const SECTIONS = [
  { id: "hours", label: "Hours" },
  { id: "closures", label: "Closures" },
  { id: "holidays", label: "Holidays" },
  { id: "staff", label: "Staff" },
  { id: "preview", label: "Preview" },
] as const;

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const user = await requireUser();
  const shops = await getMemberShops(user.id);

  if (shops.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-navy-900">No shop yet</h1>
        <p className="mt-2 text-slate-600">
          Set up your shop first. Then come back here to set your hours and holidays.
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard/setup">Set up your shop</Link>
        </Button>
      </div>
    );
  }

  const { shop: wanted } = await searchParams;
  const shop = shops.find((entry) => entry.shopId === wanted) ?? shops[0]!;
  const resource = { shopId: shop.shopId };
  const canEditShop = can(user, "shop:update", resource);
  const canBlock = can(user, "schedule:block", resource);

  const now = new Date();
  const today = manilaDate(now);
  const data = await getAvailabilityDashboard(shop.shopId, now);

  const closureItems: ClosureItem[] = [
    ...data.closures.map((closure) => ({
      ...closure,
      kind: "closure" as const,
      who: "Whole shop",
    })),
    ...data.staff.flatMap((member) =>
      member.timeOff.map((entry) => ({ ...entry, kind: "time_off" as const, who: member.name })),
    ),
  ]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(({ id, kind, who, when, reason }) => ({ id, kind, who, when, reason }));

  const holidays = upcomingHolidays(today)
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
    .map((holiday) => ({
      key: holiday.key,
      name: holiday.name,
      kind: holiday.kind,
      movable: !!holiday.movable,
      dateLabel: holiday.date
        ? formatManila(manilaToUtc(holiday.date, "12:00"), "EEE, MMM d, yyyy")
        : null,
    }));

  const previewServices = data.services
    .filter((service) => service.active && service.bookingType !== "queue")
    .map((service) => ({
      id: service.id,
      name: service.name,
      rules: [
        `${service.durationMin} min`,
        service.bufferMin > 0 && `${service.bufferMin} min buffer`,
        `${service.capacity} per slot`,
      ]
        .filter(Boolean)
        .join(" · "),
    }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy-900">Availability</h1>
        <p className="mt-1 text-slate-600">
          When customers can book <span className="font-semibold">{shop.name}</span>. Times are
          Philippine time.
        </p>
        {shops.length > 1 && (
          <nav aria-label="Your shops" className="mt-3 flex flex-wrap gap-2">
            {shops.map((entry) => (
              <Link
                key={entry.shopId}
                href={`/dashboard/availability?shop=${entry.shopId}`}
                aria-current={entry.shopId === shop.shopId ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
                  entry.shopId === shop.shopId
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-border bg-card text-navy-900 hover:border-green-700"
                }`}
              >
                {entry.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <nav
        aria-label="Availability sections"
        className="sticky top-28 z-30 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2"
      >
        <ul className="flex gap-1">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-navy-900 hover:bg-accent"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Panel
        id="hours"
        title="Weekly hours"
        description="The days and times you take bookings. Add a break for lunch or merienda; no one can book during it."
      >
        <ShopHoursForm shopId={shop.shopId} hours={data.hours} canEdit={canEditShop} />
      </Panel>

      <Panel
        id="closures"
        title="Closures and time off"
        description="Close the whole shop for a day or a few hours, or mark one person as away. Bookings already made stay; we'll tell you how many to sort out."
      >
        <ClosuresPanel
          shopId={shop.shopId}
          today={today}
          items={closureItems}
          staff={data.staff.map(({ userId, name }) => ({ userId, name }))}
          canEditShop={canEditShop}
          canBlock={canBlock}
        />
      </Panel>

      <Panel
        id="holidays"
        title="Holidays"
        description="Choose how you handle each Philippine holiday once. It repeats every year, so you don't have to add closures again."
      >
        <HolidayRulesForm
          shopId={shop.shopId}
          holidays={holidays}
          rules={data.holidayRules}
          canEdit={canEditShop}
        />
      </Panel>

      <Panel
        id="staff"
        title="Staff schedules"
        description="Choose who takes bookings and when they work. With staff schedules on, a slot is open only when someone is free."
      >
        <StaffSchedulesPanel
          shopId={shop.shopId}
          staff={data.staff}
          shopHours={data.hours}
          canEdit={canEditShop}
        />
      </Panel>

      <Panel
        id="preview"
        title="What customers see"
        description="Open start times for the next two weeks, after hours, breaks, closures, holidays, staff, bookings, buffer and capacity."
        action={
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/dashboard/services">Change buffer or capacity</Link>
          </Button>
        }
      >
        <SlotPreview
          services={previewServices}
          staff={data.staff
            .filter((member) => member.takesBookings)
            .map(({ userId, name }) => ({ userId, name }))}
          today={today}
        />
      </Panel>
    </div>
  );
}
