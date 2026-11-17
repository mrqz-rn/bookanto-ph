import {
  Ban,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Inbox,
  Lock,
  MessageSquareText,
  QrCode,
  Scissors,
  Search,
  Star,
  Store,
  Timer,
  UserRoundPlus,
} from "lucide-react";

import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

import { GoogleIcon } from "./store-icons";

// BooKanto's own screens, drawn as live HTML at true size for the landing
// page. Each one is a picture (role="img" with a label); the shop, people and
// prices are the pilot's demo shop, Kuya Jun's Barbershop in Marikina.

const TODAY = [
  { time: "9:00 AM", name: "Jerome Aquino", service: "Classic cut", status: "Done" },
  { time: "10:30 AM", name: "Nadine Flores", service: "Kids cut", status: "Done" },
  { time: "2:30 PM", name: "Maria Santos", service: "Gupit + Balbas", status: "Confirmed" },
  {
    time: "3:30 PM",
    name: "Carlo Reyes",
    service: "Gupit + Hot Towel",
    status: "New request",
    selected: true,
  },
  { time: "4:15 PM", name: "Liza Mendoza", service: "Kids cut", status: "Walk-in" },
  { time: "5:00 PM", name: "Paolo Villanueva", service: "Classic cut", status: "Confirmed" },
] as const;

const NEXT_UP = [
  { time: "2:30 PM", name: "Maria Santos", service: "Gupit + Balbas", status: "Confirmed" },
  { time: "4:15 PM", name: "Liza Mendoza", service: "Kids cut", status: "Walk-in" },
  { time: "6:00 PM", name: "Mark Dela Cruz", service: "Gupit + Balbas", status: "Confirmed" },
];

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "New request"
      ? "mk-chip--new"
      : status === "Confirmed"
        ? "mk-chip--ok"
        : "mk-chip--muted";
  return <span className={cn("mk-chip", tone)}>{status}</span>;
}

/** Hero: the shop owner's phone on the Today screen, a new request on top. */
export function PhoneInbox({ className }: { className?: string }) {
  return (
    <div
      role="img"
      data-visual
      aria-label="The BooKanto app on a shop owner's phone: a new booking request from Carlo Reyes with Accept and Suggest time buttons, above today's confirmed bookings"
      className={cn("mk-phone mk-ui ui", className)}
    >
      <div className="mk-phone__status">
        <span>9:41</span>
        <span className="tracking-[0.2em]">●●●</span>
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <div>
          <p className="text-[15px] font-bold">Kuya Jun&apos;s Barbershop</p>
          <p className="text-[12px] text-[var(--ink-2)]">Today · Wed, Mar 10</p>
        </div>
        <Store aria-hidden className="size-5 text-[var(--ink-2)]" />
      </div>
      <div className="mx-4 grid grid-cols-3 rounded-[10px] bg-[#eef1f5] p-1 text-center text-[12px] font-semibold">
        <span className="rounded-[7px] bg-white py-1.5 shadow-xs">Requests 2</span>
        <span className="py-1.5 text-[var(--ink-2)]">Today 11</span>
        <span className="py-1.5 text-[var(--ink-2)]">Walk-ins</span>
      </div>

      <div className="mx-4 mt-3 border-l-[3px] border-green-600 py-1 pl-3">
        <div className="flex items-center justify-between">
          <span className="mk-chip mk-chip--new">New request</span>
          <span className="text-[12px] text-[var(--ink-2)]">2 min ago</span>
        </div>
        <p className="mt-2 text-[15px] font-bold">Carlo Reyes</p>
        <p>Gupit + Hot Towel · 60 min</p>
        <p className="font-semibold">Today, 3:30 PM · ₱300</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center font-semibold">
          <span className="rounded-[8px] bg-[var(--ink)] py-2 text-white">Accept</span>
          <span className="rounded-[8px] border border-[var(--line-strong)] bg-white py-2">
            Suggest time
          </span>
        </div>
      </div>

      <p className="mx-4 mt-4 mb-1 text-[12px] font-semibold text-[var(--ink-2)]">Next up</p>
      <ul className="mx-4">
        {NEXT_UP.map((row) => (
          <li
            key={row.name}
            className="flex items-center gap-3 border-b border-[var(--line)] py-2.5"
          >
            <span className="w-14 shrink-0 text-[12px] font-semibold">{row.time}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{row.name}</span>
              <span className="block text-[12px] text-[var(--ink-2)]">{row.service}</span>
            </span>
            <StatusChip status={row.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The app frame: the desktop inbox, the day's list beside the open request. */
export function InboxWindow() {
  const sidebar = [
    { icon: Inbox, label: "Today", count: "11", active: true },
    { icon: Clock3, label: "Requests", count: "2" },
    { icon: CalendarDays, label: "Calendar" },
    { icon: UserRoundPlus, label: "Walk-ins" },
    { icon: Scissors, label: "Services and prices" },
    { icon: Ban, label: "Hours and breaks" },
    { icon: Star, label: "Reviews" },
    { icon: QrCode, label: "Shop page and QR" },
  ];

  return (
    <div
      role="img"
      data-visual
      aria-label="The BooKanto booking inbox on a computer: Wednesday's eleven bookings in a list, with Carlo Reyes's new request open and buttons to accept, suggest another time or decline"
      className="mk-ui ui mk-ui-surface grid h-full grid-rows-[44px_minmax(0,1fr)] overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[#f7f8fa] px-4">
        <span className="size-2.5 rounded-full bg-[#d5d9e0]" />
        <span className="size-2.5 rounded-full bg-[#d5d9e0]" />
        <span className="size-2.5 rounded-full bg-[#d5d9e0]" />
        <span className="ml-3 rounded-md bg-white px-3 py-1 text-[12px] text-[var(--ink-2)] ring-1 ring-[var(--line)]">
          bookanto.ph/dashboard
        </span>
      </div>

      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:grid-cols-[208px_minmax(0,1fr)_minmax(0,1.3fr)]">
        <aside className="hidden flex-col gap-0.5 border-r border-[var(--line)] p-3 lg:flex">
          <div className="mb-2 flex items-center gap-2 px-2 py-1">
            <LogoMark className="h-6" />
            <span className="font-semibold">Kuya Jun&apos;s</span>
          </div>
          {sidebar.map(({ icon: Icon, label, count, active }) => (
            <span
              key={label}
              className={cn(
                "flex items-center gap-2.5 rounded-[8px] px-2 py-2",
                active ? "bg-[#eef1f5] font-semibold" : "text-[var(--ink-2)]",
              )}
            >
              <Icon aria-hidden className="size-4" />
              <span className="flex-1">{label}</span>
              {count && <span className="text-[12px] font-semibold">{count}</span>}
            </span>
          ))}
        </aside>

        <div className="hidden min-h-0 flex-col border-r border-[var(--line)] md:flex">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
            <p className="text-[15px] font-bold">Wednesday, March 10</p>
            <span className="text-[12px] text-[var(--ink-2)]">11 bookings</span>
          </div>
          <ul className="mk-fade-b min-h-0 flex-1 overflow-hidden">
            {TODAY.map((row) => (
              <li
                key={row.name}
                className={cn(
                  "flex items-center gap-3 border-t border-[var(--line)] px-4 py-2.5",
                  "selected" in row && "bg-[#f2faf4] shadow-[inset_3px_0_0_var(--color-green-600)]",
                )}
              >
                <span className="w-16 shrink-0 text-[12px] font-semibold">{row.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{row.name}</span>
                  <span className="block text-[12px] text-[var(--ink-2)]">{row.service}</span>
                </span>
                <StatusChip status={row.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mk-chip mk-chip--new">New request</span>
            <span className="text-[12px] text-[var(--ink-2)]">
              Sent 2 min ago · expires in 1 h 58 min
            </span>
          </div>
          <p className="text-[20px] leading-tight font-bold">Carlo Reyes</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              ["Service", "Gupit + Hot Towel"],
              ["When", "Today, 3:30 to 4:30 PM"],
              ["Price", "₱300, paid at the shop"],
              ["Barber", "Kuya Jun"],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-[12px] text-[var(--ink-2)]">{term}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-[10px] bg-[#f7f8fa] p-3">
            <p className="text-[12px] text-[var(--ink-2)]">Customer note</p>
            <p>Low fade po sa gilid. Salamat!</p>
          </div>
          <p className="flex items-center gap-2 text-[12px] text-[var(--ink-2)]">
            <Lock aria-hidden className="size-3.5" />
            His phone number shows after you accept.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 font-semibold">
            <span className="rounded-[8px] bg-[var(--ink)] px-4 py-2.5 text-white">
              Accept booking
            </span>
            <span className="rounded-[8px] border border-[var(--line-strong)] px-4 py-2.5">
              Suggest another time
            </span>
            <span className="px-3 py-2.5 text-[var(--ink-2)]">Decline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const MESSAGES = [
  {
    label: "SMS sent · Confirmed",
    when: "now",
    text: "Carlo Reyes: your Gupit + Hot Towel is confirmed for today, 3:30 PM.",
  },
  {
    label: "SMS sent · Reminder",
    when: "12 min",
    text: "Maria Santos: see you today at 2:30 PM at Kuya Jun's Barbershop.",
  },
  {
    label: "Request expired",
    when: "1 h",
    text: "No answer in 2 hours, so Ana Cruz's request closed on its own.",
    muted: true,
  },
  {
    label: "SMS sent · Confirmed",
    when: "2 h",
    text: "Paolo Villanueva: Classic cut confirmed for tomorrow, 10:00 AM.",
  },
];

/** Card: a new SMS enters the stack every cycle (the card group's one loop). */
export function SmsStack() {
  return (
    <div
      role="img"
      data-visual
      aria-label="BooKanto's message log: an SMS confirmation to Carlo Reyes, a reminder to Maria Santos and a request that expired after two hours"
      className="mk-ui ui mk-sms"
    >
      {MESSAGES.map((message, index) => (
        <div key={index} className="mk-ui-surface mk-sms__item">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full",
              message.muted ? "bg-[#eef1f5] text-[var(--ink-2)]" : "bg-[#e3f4e8] text-green-800",
            )}
          >
            {message.muted ? (
              <Timer aria-hidden className="size-4" />
            ) : (
              <MessageSquareText aria-hidden className="size-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex justify-between gap-2 font-semibold">
              {message.label}
              <span className="font-normal text-[var(--ink-2)]">{message.when}</span>
            </span>
            <span className="line-clamp-2 block text-[var(--ink-2)]">{message.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Card: the chat inside one booking, rising from the panel's foot. */
export function BookingChat() {
  return (
    <div
      role="img"
      data-visual
      aria-label="A chat inside a home-service booking: the customer gives a landmark and the shop replies with the technician's arrival time"
      className="mk-ui ui mk-ui-surface absolute inset-x-6 top-8 flex flex-col gap-3 p-4 sm:inset-x-8"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <span>
          <span className="block font-semibold">Rina Bautista</span>
          <span className="block text-[12px] text-[var(--ink-2)]">
            Aircon cleaning · Tomorrow, 1:00 PM
          </span>
        </span>
        <span className="mk-chip mk-chip--ok">Confirmed</span>
      </div>
      <p className="max-w-[85%] self-start rounded-[12px] rounded-bl-[4px] bg-[#eef1f5] px-3 py-2">
        Hi po! Blue gate po kami, tapat ng sari-sari store.
      </p>
      <p className="max-w-[85%] self-end rounded-[12px] rounded-br-[4px] bg-[#e3f4e8] px-3 py-2">
        Copy po! Our technician arrives at 12:50 PM.
      </p>
      <p className="max-w-[85%] self-start rounded-[12px] rounded-bl-[4px] bg-[#eef1f5] px-3 py-2">
        Salamat po. May parking sa harap.
      </p>
      <p className="flex items-center gap-2 text-[12px] text-[var(--ink-2)]">
        <Lock aria-hidden className="size-3.5" />
        Your own number stays private.
      </p>
    </div>
  );
}

/** Card: the day column with a blocked lunch break and a walk-in. */
export function DaySchedule() {
  const rows = [
    { time: "11:00", block: { label: "Jerome Aquino · Classic cut", tone: "booked", span: 2 } },
    { time: "11:30" },
    { time: "12:00", block: { label: "Lunch break · blocked", tone: "blocked", span: 2 } },
    { time: "12:30" },
    { time: "1:00", block: { label: "Walk-in · Liza Mendoza, Kids cut", tone: "walkin", span: 1 } },
    { time: "1:30", block: { label: "Open", tone: "open", span: 1 } },
    { time: "2:00", block: { label: "Maria Santos · Gupit + Balbas", tone: "booked", span: 2 } },
    { time: "2:30" },
  ] as const;

  return (
    <div
      role="img"
      data-visual
      aria-label="Wednesday's schedule: a lunch break blocked from 12:00 to 1:00 and a walk-in logged at 1:00"
      className="mk-ui ui mk-ui-surface absolute top-8 left-6 w-[min(460px,calc(100%-24px))] p-4 sm:left-8"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">Wed, Mar 10</p>
        <span className="text-[12px] text-[var(--ink-2)]">Kuya Jun · 9 AM to 8 PM</span>
      </div>
      <div className="grid grid-cols-[48px_minmax(0,1fr)] grid-rows-[repeat(8,38px)]">
        {rows.map((row, index) => (
          <span
            key={row.time}
            className="border-t border-[var(--line)] pt-1 text-[12px] text-[var(--ink-2)]"
            style={{ gridColumn: 1, gridRow: index + 1 }}
          >
            {row.time}
          </span>
        ))}
        {rows.map((row, index) =>
          "block" in row ? (
            <span
              key={`b-${row.time}`}
              className={cn(
                "m-0.5 flex items-center rounded-[8px] px-3 text-[13px] font-semibold",
                row.block.tone === "booked" && "bg-[#eef1f5]",
                row.block.tone === "blocked" &&
                  "bg-[repeating-linear-gradient(135deg,#eef1f5_0_6px,#f8f9fb_6px_12px)] text-[var(--ink-2)]",
                row.block.tone === "walkin" && "bg-green-700 text-white",
                row.block.tone === "open" &&
                  "border border-dashed border-[var(--line-strong)] font-normal text-[var(--ink-2)]",
              )}
              style={{ gridColumn: 2, gridRow: `${index + 1} / span ${row.block.span}` }}
            >
              {row.block.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

/** Card: the shop's BooKanto page as a Google result for a local search. */
export function GoogleResult() {
  return (
    <div
      role="img"
      data-visual
      aria-label="A Google search for barbershop marikina with Kuya Jun Barbershop's BooKanto page as a result"
      className="mk-ui ui absolute top-8 right-6 left-6 flex flex-col gap-3 sm:right-8 sm:left-8"
    >
      <div className="mk-ui-surface flex items-center gap-3 rounded-full px-4 py-3">
        <GoogleIcon className="size-5 shrink-0" />
        <span className="flex-1 text-[15px]">barbershop marikina</span>
        <Search aria-hidden className="size-4 text-[#4285F4]" />
      </div>
      <div className="mk-ui-surface flex flex-col gap-1 p-4">
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#f1f3f4]">
            <LogoMark className="h-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px]">BooKanto</span>
            <span className="block text-[12px] text-[var(--ink-2)]">
              bookanto.ph › shop › kuya-jun-barbershop-marikina
            </span>
          </span>
        </span>
        <span className="mt-1 text-[18px] leading-snug text-[#1a0dab]">
          Kuya Jun Barbershop in Marikina | Book online
        </span>
        <span className="text-[var(--ink-2)]">
          Haircut from ₱150. Open today until 8:00 PM. Pick a time and book online, no app needed.
        </span>
      </div>
      <div className="mk-ui-surface flex items-center gap-3 p-4 opacity-70">
        <Store aria-hidden className="size-5 text-[var(--ink-2)]" />
        <span>
          <span className="block font-semibold">Barbershops in Marikina, from ₱100</span>
          <span className="block text-[12px] text-[var(--ink-2)]">
            bookanto.ph › marikina › barbershop
          </span>
        </span>
      </div>
    </div>
  );
}

const SLOTS = [
  { time: "9:00", state: "open" },
  { time: "9:30", state: "taken" },
  { time: "10:00", state: "open" },
  { time: "10:30", state: "picked" },
  { time: "11:00", state: "open" },
  { time: "11:30", state: "taken" },
  { time: "1:00", state: "open" },
  { time: "1:30", state: "open" },
  { time: "2:00", state: "taken" },
] as const;

/** #modes: the customer's side, booking a time slot. */
export function CustomerBookingPhone({ className }: { className?: string }) {
  return (
    <div
      role="img"
      data-visual
      aria-label="A customer booking a 10:30 haircut at Kuya Jun Barbershop on BooKanto, with a Book na button"
      className={cn("mk-phone mk-ui ui", className)}
    >
      <div className="mk-phone__status">
        <span>9:41</span>
        <span className="tracking-[0.2em]">●●●</span>
      </div>
      <div className="flex items-center gap-2 px-4 pt-2 pb-3">
        <ChevronLeft aria-hidden className="size-5" />
        <span>
          <span className="block text-[15px] font-bold">Kuya Jun Barbershop</span>
          <span className="block text-[12px] text-[var(--ink-2)]">Concepcion Uno, Marikina</span>
        </span>
      </div>
      <div className="mx-4 grid grid-cols-4 gap-1 rounded-[10px] bg-[#eef1f5] p-1 text-center text-[12px] font-semibold">
        <span className="rounded-[7px] bg-white py-1.5 shadow-xs">Slot</span>
        <span className="py-1.5 text-[var(--ink-2)]">Home</span>
        <span className="py-1.5 text-[var(--ink-2)]">Quote</span>
        <span className="py-1.5 text-[var(--ink-2)]">Queue</span>
      </div>
      <div className="mx-4 mt-3 flex items-center justify-between rounded-[12px] border-2 border-green-600 bg-[#f2faf4] p-3">
        <span>
          <span className="block font-semibold">Haircut</span>
          <span className="block text-[12px] text-[var(--ink-2)]">30 min</span>
        </span>
        <span className="font-bold">₱150</span>
      </div>
      <p className="mx-4 mt-4 mb-2 font-semibold">Choose a time · Wed, Mar 10</p>
      <div className="mx-4 grid grid-cols-3 gap-2">
        {SLOTS.map((slot) => (
          <span
            key={slot.time}
            className={cn(
              "rounded-[8px] py-2 text-center",
              slot.state === "picked" && "bg-[var(--ink)] font-semibold text-white",
              slot.state === "taken" &&
                "border border-dashed border-[var(--line-strong)] text-[var(--ink-2)] line-through",
              slot.state === "open" && "border border-[var(--line-strong)] font-medium",
            )}
          >
            {slot.time}
          </span>
        ))}
      </div>
      <span className="mx-4 mt-4 block rounded-[10px] bg-green-700 py-3 text-center text-[15px] font-bold text-white">
        Book na · 10:30 AM
      </span>
      <p className="mx-4 mt-2 text-center text-[12px] text-[var(--ink-2)]">
        Pay at the shop. Free to cancel.
      </p>
      <p className="mx-4 mt-5 mb-1 font-semibold">More services</p>
      <ul className="mx-4">
        {[
          ["Gupit + Balbas", "45 min", "₱250"],
          ["Kids cut", "30 min", "₱120"],
          ["Hot towel shave", "30 min", "₱180"],
        ].map(([name, length, price]) => (
          <li
            key={name}
            className="flex items-center justify-between border-b border-[var(--line)] py-2.5"
          >
            <span>
              <span className="block font-semibold">{name}</span>
              <span className="block text-[12px] text-[var(--ink-2)]">{length}</span>
            </span>
            <span className="font-semibold">{price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ALERTS = [
  { when: "now", title: "New booking request", text: "Carlo Reyes · Gupit + Hot Towel, 3:30 PM" },
  { when: "12m", title: "Walk-in added", text: "Liza Mendoza · Kids cut, 4:15 PM" },
  { when: "1h", title: "Reminder sent", text: "Maria Santos · Gupit + Balbas, 2:30 PM" },
];

/** #mobile: the coming apps, alerts on a locked phone. */
export function LockScreenPhone({ className }: { className?: string }) {
  return (
    <div
      role="img"
      data-visual
      aria-label="A locked phone showing BooKanto alerts: a new booking request, a walk-in and a reminder sent"
      className={cn(
        "mk-phone mk-ui border-[#0b1426] bg-[linear-gradient(170deg,#1f6b45_0%,#14213d_55%,#0e172b_100%)] text-white",
        className,
      )}
    >
      <div className="mk-phone__status">
        <span>9:41</span>
        <span className="tracking-[0.2em]">●●●</span>
      </div>
      <p className="mt-6 text-center text-[13px] font-semibold text-white/85">
        Wednesday, March 10
      </p>
      <p className="text-center font-display text-[64px] leading-none font-bold">9:41</p>
      <ul className="mx-3 mt-8 flex flex-col gap-2">
        {ALERTS.map((alert) => (
          <li
            key={alert.title}
            className="flex gap-3 rounded-[16px] bg-white p-3 text-[var(--ink)]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-[#f2faf4]">
              <LogoMark className="h-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex justify-between text-[12px] text-[var(--ink-2)]">
                BooKanto
                <span>{alert.when}</span>
              </span>
              <span className="block font-semibold">{alert.title}</span>
              <span className="block text-[var(--ink-2)]">{alert.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
