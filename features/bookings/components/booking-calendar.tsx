"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { manilaDate, manilaToUtc } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  filterBookings,
  groupByDay,
  hourRange,
  hoursOn,
  inWindow,
  isCancelled,
  manilaMinutes,
  minutesToTime,
  rangeTitle,
  stepDate,
  visibleDays,
  type CalendarClosure,
  type CalendarView,
  type StaffFilter,
  type WeekdayHours,
} from "../calendar";
import type { BookingListItem } from "../constants";
import { BookingDetailModal } from "./booking-detail-modal";
import {
  CalendarHeader,
  CalendarLegend,
  CalendarToolbar,
  DayAgenda,
  MonthGrid,
  WeekView,
} from "./calendar-parts";
import { useNow } from "./use-now";
import { WalkInModal } from "./walk-in-modal";

// The shop's calendar: a week time grid (one day at a time on a phone) or a
// month of days with the chosen day's list. The view and day live in the URL;
// the server loads three months around it, and a step past them reloads.

type BookingCalendarProps = {
  shopId: string;
  initialBookings: BookingListItem[];
  activeServices: Array<{
    id: string;
    name: string;
    priceCentavos: number | null;
    durationMin: number;
  }>;
  shopStaff: Array<{ userId: string; name: string; role: string }>;
  /** The view and Manila day to open on. */
  initialView?: CalendarView;
  initialDate?: string;
  /** The Manila days the bookings cover; a step outside them reloads the page. */
  loaded?: { from: string; to: string };
  hours?: WeekdayHours[];
  closures?: CalendarClosure[];
  /** The server's render time, so the first client render matches it. */
  renderedAt?: string;
};

export function BookingCalendar({
  shopId,
  initialBookings,
  activeServices,
  shopStaff,
  initialView = "week",
  initialDate,
  loaded,
  hours = [],
  closures = [],
  renderedAt,
}: BookingCalendarProps) {
  const router = useRouter();
  const nowMs = useNow(renderedAt);
  const todayKey = manilaDate(nowMs);

  const [view, setView] = React.useState<CalendarView>(initialView);
  const [date, setDate] = React.useState<string>(() => initialDate ?? manilaDate(nowMs));
  const [staff, setStaff] = React.useState<StaffFilter>("all");
  const [showCancelled, setShowCancelled] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingListItem | null>(null);
  const [walkIn, setWalkIn] = React.useState<{ open: boolean; time?: string }>({ open: false });
  const [pending, startTransition] = React.useTransition();

  /** Moves the calendar, keeping the URL in step; reloads past the loaded months. */
  function go(nextView: CalendarView, nextDate: string) {
    setView(nextView);
    setDate(nextDate);
    const url = `/dashboard/calendar?view=${nextView}&date=${nextDate}`;
    if (loaded && !inWindow(visibleDays(nextView, nextDate), loaded)) {
      startTransition(() => router.replace(url, { scroll: false }));
    } else {
      window.history.replaceState(null, "", url);
    }
  }

  const days = React.useMemo(() => visibleDays(view, date), [view, date]);
  const inView = React.useMemo(() => {
    const set = new Set(days);
    return initialBookings.filter((b) => set.has(manilaDate(b.startAt)));
  }, [initialBookings, days]);
  const shown = React.useMemo(
    () => filterBookings(inView, staff, showCancelled),
    [inView, staff, showCancelled],
  );
  const byDay = React.useMemo(() => groupByDay(shown), [shown]);
  const cancelledCount = filterBookings(inView, staff, true).filter(isCancelled).length;
  const { startHour, endHour } = hourRange(hours, shown);

  const hasUnassigned = initialBookings.some((b) => b.staffId === null);
  const staffOptions =
    shopStaff.length > 1
      ? [
          { value: "all", label: "Everyone" },
          ...shopStaff.map((s) => ({ value: s.userId, label: s.name })),
          ...(hasUnassigned ? [{ value: "unassigned", label: "Not assigned" }] : []),
        ]
      : [];
  const showStaff = shopStaff.length > 1 && staff === "all";

  function openWalkIn(day?: string, minutes?: number) {
    if (!day || (day === todayKey && minutes === undefined)) {
      setWalkIn({ open: true });
      return;
    }
    const start = minutes ?? hoursOn(hours, day)?.opensMin ?? 9 * 60;
    setWalkIn({ open: true, time: manilaToUtc(day, minutesToTime(start)).toISOString() });
  }

  const grid = {
    byDay,
    hours,
    closures,
    startHour,
    endHour,
    todayKey,
    nowMin: manilaMinutes(nowMs),
    showStaff,
    onOpen: setSelectedBooking,
    onAddAt: (day: string, minutes: number) => openWalkIn(day, minutes),
  };

  return (
    <div className="space-y-6">
      <CalendarHeader view={view} bookings={shown} onAddWalkIn={() => openWalkIn()} />

      <div className="space-y-4">
        <CalendarToolbar
          view={view}
          title={rangeTitle(view, date)}
          onView={(next) => go(next, date)}
          onStep={(direction) => go(view, stepDate(view, date, direction))}
          onToday={() => go(view, todayKey)}
          staff={staff}
          staffOptions={staffOptions}
          onStaff={setStaff}
        />
        <CalendarLegend
          showCancelled={showCancelled}
          cancelledCount={cancelledCount}
          onToggleCancelled={() => setShowCancelled((v) => !v)}
        />
      </div>

      <div
        aria-busy={pending}
        className={cn("transition-opacity", pending && "pointer-events-none opacity-60")}
      >
        {view === "week" ? (
          <WeekView
            days={days}
            selected={days.includes(date) ? date : days[0]!}
            onSelect={(day) => go("week", day)}
            {...grid}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
            <div className="xl:col-span-8">
              <MonthGrid
                days={days}
                monthKey={date}
                selected={date}
                todayKey={todayKey}
                byDay={byDay}
                hours={hours}
                onSelect={(day) => go("month", day)}
              />
            </div>
            <DayAgenda
              className="xl:sticky xl:top-32 xl:col-span-4"
              day={date}
              todayKey={todayKey}
              bookings={byDay.get(date) ?? []}
              hours={hours}
              closures={closures}
              showStaff={showStaff}
              onOpen={setSelectedBooking}
              onAddWalkIn={() => openWalkIn(date)}
            />
          </div>
        )}
      </div>

      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        shopStaff={shopStaff}
        onActionComplete={() => {
          setSelectedBooking(null);
          router.refresh();
        }}
      />

      <WalkInModal
        isOpen={walkIn.open}
        onClose={() => setWalkIn({ open: false })}
        shopId={shopId}
        services={activeServices}
        staff={shopStaff}
        initialTime={walkIn.time}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
