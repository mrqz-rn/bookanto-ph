"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatManila, manilaDate } from "@/lib/time";
import type { BookingListItem } from "../constants";
import { BookingDetailModal } from "./booking-detail-modal";
import { WalkInModal } from "./walk-in-modal";

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
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingCalendar({
  shopId,
  initialBookings,
  activeServices,
  shopStaff,
}: BookingCalendarProps) {
  const router = useRouter();
  const [viewMode] = React.useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [staffFilter, setStaffFilter] = React.useState<string>("all");

  const [selectedBooking, setSelectedBooking] = React.useState<BookingListItem | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [walkInTime, setWalkInTime] = React.useState<string | undefined>(undefined);

  // Filter bookings by staff
  const bookings = React.useMemo(() => {
    if (staffFilter === "all") return initialBookings;
    return initialBookings.filter((b) => b.staffId === staffFilter);
  }, [initialBookings, staffFilter]);

  // Group bookings by date string YYYY-MM-DD
  const bookingsByDate = React.useMemo(() => {
    const map = new Map<string, BookingListItem[]>();
    for (const b of bookings) {
      const dateKey = manilaDate(b.startAt);
      const list = map.get(dateKey) || [];
      list.push(b);
      map.set(dateKey, list);
    }
    return map;
  }, [bookings]);

  // Calendar month days calculation
  const monthDays = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0-6

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dateKey: manilaDate(d),
        isCurrentMonth: false,
        dayNumber: daysInPrevMonth - i,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateKey: manilaDate(d),
        isCurrentMonth: true,
        dayNumber: i,
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: d,
          dateKey: manilaDate(d),
          isCurrentMonth: false,
          dayNumber: i,
        });
      }
    }

    return days;
  }, [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 86_400_000));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 86_400_000));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (dateKey: string, hour = 9) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoString = `${dateKey}T${pad(hour)}:00:00.000Z`;
    setWalkInTime(isoString);
    setIsWalkInOpen(true);
  };

  const todayKey = manilaDate(new Date());

  return (
    <div className="space-y-6">
      {/* Calendar Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
              {formatManila(currentDate, "MMMM yyyy")}
            </h1>
            <div className="flex items-center rounded-lg border border-neutral-200 bg-white shadow-2xs">
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-l-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
                title="Previous"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="border-x border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-r-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
                title="Next"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            View booking slots, staff schedules, and capacity across the calendar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Staff Filter */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-xs text-neutral-800 outline-none"
          >
            <option value="all">All Team Members</option>
            {shopStaff.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>

          {/* Quick Walk-in Button */}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setWalkInTime(undefined);
              setIsWalkInOpen(true);
            }}
            className="bg-green-600 text-xs font-bold text-white hover:bg-green-500"
          >
            <Plus className="mr-1.5 size-4" />+ Record Walk-in
          </Button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xs">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-xs font-bold text-neutral-600">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2.5">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200">
          {monthDays.map((day, idx) => {
            const dayBookings = bookingsByDate.get(day.dateKey) || [];
            const isToday = day.dateKey === todayKey;

            return (
              <div
                key={idx}
                className={`flex min-h-28 flex-col justify-between p-2 transition-colors ${
                  day.isCurrentMonth ? "bg-white" : "bg-neutral-50/50 text-neutral-400"
                } ${isToday ? "bg-orange-50/20 ring-2 ring-orange-500/50 ring-inset" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-orange-600 text-white"
                          : day.isCurrentMonth
                            ? "text-neutral-900"
                            : "text-neutral-400"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-bold text-neutral-500">
                        {dayBookings.length} {dayBookings.length === 1 ? "appt" : "appts"}
                      </span>
                    )}
                  </div>

                  {/* Bookings pills */}
                  <div className="mt-1.5 space-y-1">
                    {dayBookings.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                        className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition-transform hover:scale-[1.02] ${
                          b.status === "confirmed"
                            ? "border border-emerald-200 bg-emerald-100 text-emerald-900"
                            : b.status === "requested"
                              ? "border border-amber-200 bg-amber-100 text-amber-900"
                              : b.status === "completed"
                                ? "border border-teal-200 bg-teal-100 text-teal-900"
                                : "border border-neutral-200 bg-neutral-100 text-neutral-700"
                        }`}
                        title={`${formatManila(b.startAt, "h:mm a")} - ${b.serviceName} (${b.customerName})`}
                      >
                        <span className="font-semibold">{formatManila(b.startAt, "h:mm a")}</span>{" "}
                        {b.serviceName}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div
                        onClick={() => handleSlotClick(day.dateKey)}
                        className="cursor-pointer pl-1 text-[10px] font-semibold text-neutral-500 hover:text-navy-900"
                      >
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Add slot link on hover */}
                <button
                  type="button"
                  onClick={() => handleSlotClick(day.dateKey)}
                  className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-neutral-400 opacity-0 transition-opacity hover:text-green-700 hover:opacity-100"
                >
                  <Plus className="size-3" /> Add
                </button>
              </div>
            );
          })}
        </div>
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
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        shopId={shopId}
        services={activeServices}
        staff={shopStaff}
        initialTime={walkInTime}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
