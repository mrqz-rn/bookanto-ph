"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { formatManila, formatManilaTime } from "@/lib/time";
import { acceptBooking, completeBooking, markNoShow } from "../actions";
import type { BookingListItem } from "../constants";
import {
  countByView,
  groupByDay,
  INBOX_VIEWS,
  initialView,
  matchesFilters,
  summaryLine,
  type InboxView,
} from "../inbox";
import { BookingDetailModal } from "./booking-detail-modal";
import { ActionError, SuccessNotice } from "./booking-ui";
import { DeclineDialog } from "./decline-dialog";
import {
  DayGroupList,
  InboxEmpty,
  InboxHeader,
  InboxNoBookings,
  InboxTabs,
  InboxToolbar,
  type InboxActions,
} from "./inbox-parts";
import { useNow } from "./use-now";

// The shop's booking inbox: requests to answer, confirmed bookings coming up
// and everything that's finished, each grouped by the day it happens.

type QuickAction = "accept" | "complete" | "no_show";

const FAILED: Record<QuickAction, string> = {
  accept: "Couldn't accept the booking. Try again.",
  complete: "Couldn't mark the booking done. Try again.",
  no_show: "Couldn't mark the no-show. Try again.",
};

const CALLS = { accept: acceptBooking, complete: completeBooking, no_show: markNoShow };

function doneMessage(action: QuickAction, booking: BookingListItem): string {
  const when = `${formatManila(booking.startAt, "EEE, MMM d")} at ${formatManilaTime(booking.startAt)}`;
  if (action === "accept") return `Accepted. ${booking.customerName} is booked for ${when}.`;
  if (action === "complete") return `Marked ${booking.customerName}'s ${booking.serviceName} done.`;
  return `Marked ${booking.customerName} as a no-show.`;
}

type BookingInboxProps = {
  shopId?: string;
  initialBookings: BookingListItem[];
  shopStaff: Array<{ userId: string; name: string; role: string }>;
  /** The public shop page, for the empty state; null while the shop isn't live. */
  shopSlug?: string | null;
  /** The server's render time, so the first client render matches it. */
  renderedAt?: string;
};

export function BookingInbox({
  initialBookings,
  shopStaff,
  shopSlug = null,
  renderedAt,
}: BookingInboxProps) {
  const router = useRouter();
  const nowMs = useNow(renderedAt);

  const [view, setView] = React.useState<InboxView>(() => initialView(initialBookings));
  const [search, setSearch] = React.useState("");
  const [staffId, setStaffId] = React.useState("all");
  const [selected, setSelected] = React.useState<BookingListItem | null>(null);
  const [declining, setDeclining] = React.useState<BookingListItem | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function runQuick(booking: BookingListItem, action: QuickAction) {
    setBusyId(booking.id);
    setError(null);
    setNotice(null);
    const result = await CALLS[action]({ bookingId: booking.id });
    setBusyId(null);
    if (result.ok) {
      setNotice(doneMessage(action, booking));
      router.refresh();
    } else {
      setError(result.message || FAILED[action]);
    }
  }

  const actions: InboxActions = {
    busyId,
    onOpen: setSelected,
    onAccept: (b) => void runQuick(b, "accept"),
    onComplete: (b) => void runQuick(b, "complete"),
    onNoShow: (b) => void runQuick(b, "no_show"),
    onDecline: setDeclining,
  };

  const filters = { search, staffId };
  const filtering = search.trim() !== "" || staffId !== "all";
  const matching = initialBookings.filter((b) => matchesFilters(b, filters));
  const counts = countByView(matching);
  const groups = groupByDay(matching, view, nowMs);
  const elsewhereView = INBOX_VIEWS.find((v) => v.id !== view && counts[v.id] > 0)?.id;

  return (
    <div className="max-w-8xl space-y-6">
      <InboxHeader summary={summaryLine(initialBookings, nowMs)} />

      {error && <ActionError message={error} onDismiss={() => setError(null)} />}
      {notice && <SuccessNotice message={notice} onDismiss={() => setNotice(null)} />}

      {initialBookings.length === 0 ? (
        <InboxNoBookings shopSlug={shopSlug} />
      ) : (
        <>
          <div className="space-y-4">
            <InboxTabs view={view} counts={counts} onChange={setView} />
            <InboxToolbar
              search={search}
              onSearch={setSearch}
              staffId={staffId}
              onStaff={setStaffId}
              staff={shopStaff}
            />
          </div>

          <div
            role="tabpanel"
            id="inbox-panel"
            aria-labelledby={`inbox-tab-${view}`}
            className="space-y-8"
          >
            {groups.length === 0 ? (
              <InboxEmpty
                view={view}
                filtering={filtering}
                search={search}
                elsewhere={
                  elsewhereView ? { view: elsewhereView, count: counts[elsewhereView] } : null
                }
                onClear={() => {
                  setSearch("");
                  setStaffId("all");
                }}
                onShowView={setView}
              />
            ) : (
              groups.map((group) => (
                <DayGroupList
                  key={group.key}
                  group={group}
                  view={view}
                  nowMs={nowMs}
                  actions={actions}
                />
              ))
            )}
          </div>
        </>
      )}

      <BookingDetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        booking={selected}
        shopStaff={shopStaff}
        onActionComplete={(message) => {
          setSelected(null);
          if (message) setNotice(message);
          router.refresh();
        }}
        onUpdated={() => router.refresh()}
      />

      {declining && (
        <DeclineDialog
          isOpen
          onClose={() => setDeclining(null)}
          bookingId={declining.id}
          refCode={declining.refCode}
          onSuccess={() => {
            setNotice(`Declined ${declining.customerName}'s request.`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
