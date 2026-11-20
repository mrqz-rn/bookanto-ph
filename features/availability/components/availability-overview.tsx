import Link from "next/link";
import { CalendarOff, ChevronRight, PartyPopper, UsersRound } from "lucide-react";

import { WEEKDAYS, type DayHours } from "../constants";
import { DayTimeline, formatWeekHours, hoursLabel, timelineSpan, weeklyMinutes } from "./panel";

type Fact = {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  detail?: string;
};

/**
 * The shop's week at a glance, drawn from its saved hours, beside what comes
 * next: the next closure, the next holiday and who takes bookings.
 */
export function AvailabilityOverview({
  hours,
  nextClosure,
  nextHoliday,
  bookableStaff,
  staffCount,
}: {
  hours: DayHours[];
  nextClosure: { when: string; who: string } | null;
  nextHoliday: { name: string; dateLabel: string; plan: string } | null;
  bookableStaff: number;
  staffCount: number;
}) {
  const span = timelineSpan(hours);
  const facts: Fact[] = [
    {
      href: "#closures",
      icon: CalendarOff,
      label: "Next closure",
      value: nextClosure?.when ?? "None planned",
      detail: nextClosure?.who,
    },
    {
      href: "#holidays",
      icon: PartyPopper,
      label: "Next holiday",
      value: nextHoliday ? `${nextHoliday.name}, ${nextHoliday.dateLabel}` : "None this year",
      detail: nextHoliday?.plan,
    },
    {
      href: "#staff",
      icon: UsersRound,
      label: "Taking bookings",
      value:
        bookableStaff === 0
          ? "Shop hours and capacity"
          : `${bookableStaff} of ${staffCount} ${staffCount === 1 ? "person" : "people"}`,
    },
  ];

  return (
    <section
      aria-labelledby="overview-title"
      className="grid overflow-hidden rounded-2xl border border-border bg-white lg:grid-cols-[1.35fr_1fr]"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="overview-title" className="font-display text-2xl font-bold text-navy-900">
            Your week
          </h2>
          <p className="text-sm font-semibold text-green-700">
            {hours.length === 0
              ? "No open days set"
              : `Open ${hours.length} ${hours.length === 1 ? "day" : "days"} · ${formatWeekHours(weeklyMinutes(hours))}`}
          </p>
        </div>
        <ul className="mt-4 space-y-2.5">
          {WEEKDAYS.map((day) => {
            const saved = hours.find((entry) => entry.weekday === day.weekday);
            return (
              <li
                key={day.weekday}
                className="grid grid-cols-[2.75rem_1fr_6.5rem] items-center gap-3"
              >
                <span className="text-sm font-semibold text-navy-900">{day.short}</span>
                {saved ? (
                  <DayTimeline
                    opens={saved.opens}
                    closes={saved.closes}
                    breakStart={saved.breakStart}
                    breakEnd={saved.breakEnd}
                    span={span}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-2.5 rounded-full border border-dashed border-border"
                  />
                )}
                <span className="text-right text-sm text-slate-600 tabular-nums">
                  {saved ? hoursLabel(saved.opens, saved.closes) : "Closed"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <ul className="divide-y divide-border border-t border-border bg-neutral-50 lg:border-t-0 lg:border-l">
        {facts.map((fact) => (
          <li key={fact.label}>
            <Link
              href={fact.href}
              className="group flex min-h-20 items-center gap-3 px-4 py-4 transition-colors outline-none hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-6"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-green-700 ring-1 ring-border">
                <fact.icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  {fact.label}
                </span>
                <span className="block truncate font-semibold text-navy-900">{fact.value}</span>
                {fact.detail && (
                  <span className="block truncate text-sm text-slate-600">{fact.detail}</span>
                )}
              </span>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
