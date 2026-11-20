"use client";

import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Small pieces the shop's booking screens share (Today, the inbox, the booking
// sheet). Kept apart from any one screen so a page only loads what it shows.

/** Buttons step up on hover and press on click (reduced motion: they stay put). */
export const PRESS =
  "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]";

export const FOCUS_RING = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** A spinner in place of a button's label while its action runs. */
export function Busy({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return busy ? <Loader2 aria-label="Working" className="size-4 animate-spin" /> : children;
}

export function ActionError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-danger"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-red-100"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

export function SuccessNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-green-600/30 bg-accent p-4 text-sm text-navy-900"
    >
      <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" />
      <p className="flex-1 font-medium">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className={cn(
          "-m-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-green-600/10",
          FOCUS_RING,
        )}
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
