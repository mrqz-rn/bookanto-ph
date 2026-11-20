"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { PwaInstallButton } from "@/features/pwa/components/pwa-install-button";
import { saveTodayBookingsCache } from "@/features/pwa/offline-bookings-cache";
import { setAcceptingToday } from "@/features/shops/actions";
import { formatManila } from "@/lib/time";
import { acceptBooking, completeBooking, markNoShow } from "../actions";
import type { BookingListItem, TodayDashboardData, TodayHours } from "../constants";
import { hoursLine, pickUpNext, type TodayFilter } from "../today";
import { BookingDetailModal } from "./booking-detail-modal";
import { DeclineDialog } from "./decline-dialog";
import {
  ActionError,
  DaySummary,
  OfflineNotice,
  RequestsPanel,
  ScheduleCard,
  TodayHeader,
  UpNextCard,
  type RowActions,
} from "./today-parts";
import { WalkInModal } from "./walk-in-modal";

// The shop's Today screen: requests waiting for an answer, who's up next,
// the day so far and the schedule with a live "Now" line.

const DATE_PATTERN = "EEEE, MMMM d, yyyy";

const FAILED: Record<QuickAction, string> = {
  accept: "Couldn't accept the booking. Try again.",
  complete: "Couldn't mark the booking done. Try again.",
  no_show: "Couldn't mark the no-show. Try again.",
};

type QuickAction = "accept" | "complete" | "no_show";

/** The current time, ticking every 30 seconds. Starts at the server's time so both renders agree. */
function useNow(initialIso?: string) {
  const [now, setNow] = React.useState(() =>
    initialIso ? new Date(initialIso).getTime() : Date.now(),
  );
  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function useOnline(onReconnect: () => void) {
  const [online, setOnline] = React.useState(true);
  const reconnect = React.useRef(onReconnect);
  React.useEffect(() => {
    reconnect.current = onReconnect;
  });
  React.useEffect(() => {
    setOnline(window.navigator.onLine);
    const up = () => {
      setOnline(true);
      reconnect.current();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function TodayView({
  shopId,
  shopSlug = null,
  data,
  hours,
  renderedAt,
}: {
  shopId: string;
  /** The public shop page, for the empty state; null while the shop isn't live. */
  shopSlug?: string | null;
  data: TodayDashboardData;
  /** Today's opening hours; undefined when unknown (a schedule saved offline). */
  hours?: TodayHours | null;
  /** The server's render time, so the first client render matches it. */
  renderedAt?: string;
}) {
  const router = useRouter();
  const nowMs = useNow(renderedAt);
  const online = useOnline(() => router.refresh());

  const [filter, setFilter] = React.useState<TodayFilter>("all");
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BookingListItem | null>(null);
  const [declining, setDeclining] = React.useState<BookingListItem | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(data.isAcceptingToday);
  const [toggling, setToggling] = React.useState(false);

  // Keep today's schedule on the phone for when the signal drops.
  React.useEffect(() => {
    saveTodayBookingsCache(shopId, data);
  }, [shopId, data]);

  async function runQuick(bookingId: string, action: QuickAction) {
    if (!window.navigator.onLine) return;
    setBusyId(bookingId);
    setError(null);
    const call =
      action === "accept" ? acceptBooking : action === "complete" ? completeBooking : markNoShow;
    const result = await call({ bookingId });
    setBusyId(null);
    if (result.ok) router.refresh();
    else setError(result.message || FAILED[action]);
  }

  async function toggleAccepting() {
    if (!window.navigator.onLine) return;
    setToggling(true);
    setError(null);
    const next = !accepting;
    const result = await setAcceptingToday({ shopId, accepting: next });
    setToggling(false);
    if (result.ok) {
      setAccepting(next);
      router.refresh();
    } else {
      setError(result.message || "Couldn't change whether you're taking bookings. Try again.");
    }
  }

  const actions: RowActions = {
    busyId,
    offline: !online,
    onAccept: (id) => void runQuick(id, "accept"),
    onComplete: (id) => void runQuick(id, "complete"),
    onNoShow: (id) => void runQuick(id, "no_show"),
    onDecline: setDeclining,
    onOpen: setSelected,
  };

  const isToday = data.todayDateFormatted === formatManila(new Date(nowMs), DATE_PATTERN);
  const upNext = isToday ? pickUpNext(data.todayBookings, nowMs) : null;
  const openWalkIn = () => setWalkInOpen(true);

  return (
    <div className="space-y-6">
      <TodayHeader
        dateLabel={data.todayDateFormatted.replace(/, \d{4}$/, "")}
        hoursText={isToday ? hoursLine(hours, nowMs) : null}
        accepting={accepting}
        toggling={toggling}
        offline={!online}
        onToggleAccepting={() => void toggleAccepting()}
        onAddWalkIn={openWalkIn}
        installButton={
          <PwaInstallButton size="default" variant="outline" className="hidden md:inline-flex" />
        }
      />

      {!online && <OfflineNotice />}
      {error && <ActionError message={error} onDismiss={() => setError(null)} />}

      {data.pendingRequests.length > 0 && (
        <RequestsPanel requests={data.pendingRequests} nowMs={nowMs} actions={actions} />
      )}

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:sticky lg:top-32 lg:order-2 lg:col-span-4">
          <UpNextCard
            upNext={upNext}
            hasBookings={data.todayBookings.length > 0}
            nowMs={nowMs}
            actions={actions}
          />
          <DaySummary bookings={data.todayBookings} />
        </div>
        <ScheduleCard
          className="lg:order-1 lg:col-span-8"
          bookings={data.todayBookings}
          filter={filter}
          onFilter={setFilter}
          nowMs={nowMs}
          isToday={isToday}
          actions={actions}
          onAddWalkIn={openWalkIn}
          shopSlug={shopSlug}
        />
      </div>

      <WalkInModal
        isOpen={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        shopId={shopId}
        services={data.activeServices}
        staff={data.shopStaff}
        onSuccess={() => router.refresh()}
      />

      <BookingDetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        booking={selected}
        shopStaff={data.shopStaff}
        onActionComplete={() => {
          setSelected(null);
          router.refresh();
        }}
      />

      {declining && (
        <DeclineDialog
          isOpen
          onClose={() => setDeclining(null)}
          bookingId={declining.id}
          refCode={declining.refCode}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
