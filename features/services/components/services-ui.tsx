"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The pieces every screen of Services & prices shares: the sheet the forms
// open in, form fields, notices and the inline delete check. State and server
// calls stay in the screens; these only draw.

/** Buttons step up on hover and press on click (reduced motion: they stay put). */
export const PRESS =
  "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]";

export const FOCUS_RING = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const CARD = "rounded-2xl border border-border bg-white";

/** Native selects, sized like the Input primitive (16px text so phones don't zoom). */
export const SELECT =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base text-navy-900 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

/** A spinner in place of a button's label while its action runs. */
export function Busy({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return busy ? <Loader2 aria-label="Working" className="size-4 animate-spin" /> : children;
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export function ActionError({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-danger"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className={cn(
            "-m-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-red-100",
            FOCUS_RING,
          )}
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
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

// ---------------------------------------------------------------------------
// Sheet: a bottom sheet on phones, a centred dialog from 640px
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned under the scrolling body: the sheet's Cancel and main action. */
  footer?: React.ReactNode;
  wide?: boolean;
  /** While a save runs, Escape and the backdrop don't close the sheet. */
  busy?: boolean;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  const busyRef = React.useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  React.useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // The panel itself, not its first field, so phones don't open the keyboard
    // over the form before the shop owner has seen it.
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-navy-900/50 motion-safe:animate-in motion-safe:fade-in-0"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-xl outline-none sm:max-h-[88dvh] sm:rounded-3xl",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-8 sm:motion-safe:slide-in-from-bottom-0 sm:motion-safe:zoom-in-95",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <header className="flex items-start gap-3 border-b border-border px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-2xl font-bold text-navy-900">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1 text-sm text-slate-600">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className={cn(
              "-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-neutral-100 hover:text-navy-900 disabled:opacity-50",
              FOCUS_RING,
            )}
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:pb-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export function Field({
  label,
  htmlFor,
  hint,
  optional = false,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-900">
        {label}
        {optional && <span className="ml-1.5 font-normal text-slate-600">Optional</span>}
      </label>
      {children}
      {hint && <p className="text-sm text-slate-600">{hint}</p>}
    </div>
  );
}

/** A peso amount: the ₱ sits inside the field so the number reads as money. */
export function PesoInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base font-semibold text-slate-600"
      >
        ₱
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className={cn(
          "h-11 w-full min-w-0 rounded-md border border-input bg-white py-1 pr-3 pl-8 text-base text-navy-900 tabular-nums shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** An on/off switch with its label beside it, one 44px target. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-xl text-left disabled:opacity-60",
        FOCUS_RING,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-green-600" : "bg-neutral-300 group-hover:bg-neutral-400",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold whitespace-nowrap text-navy-900">{label}</span>
        {description && <span className="block text-sm text-slate-600">{description}</span>}
      </span>
    </button>
  );
}

/** A small label on a row: "Hidden", "Save 20%". */
export function Chip({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "accent" | "highlight";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold whitespace-nowrap",
        tone === "muted" && "bg-muted text-slate-600",
        tone === "accent" && "bg-accent text-green-800",
        tone === "highlight" && "bg-yellow-400 text-navy-900",
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Empty states and the inline delete check
// ---------------------------------------------------------------------------

export function EmptyPanel({
  icon,
  title,
  children,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn(CARD, "flex flex-col items-center px-5 py-12 text-center sm:px-10")}>
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-green-700">
        {icon}
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-navy-900">{title}</h2>
      <div className="mt-1.5 max-w-md text-base text-slate-600">{children}</div>
      {actions && (
        <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Replaces a row's actions with "Delete X? Cancel / Delete" so a stray tap
 * never deletes anything, without a browser confirm() box.
 */
export function ConfirmDelete({
  what,
  busy,
  onCancel,
  onConfirm,
}: {
  what: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div
      role="group"
      aria-label={`Delete ${what}`}
      className="flex w-full flex-col gap-2 rounded-xl bg-red-50 p-3 sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-sm font-medium text-danger">
        Delete {what}? You can&apos;t undo this.
      </p>
      <div className="flex gap-2">
        <Button
          ref={cancelRef}
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
          className={cn("flex-1 sm:flex-none", PRESS)}
        >
          Keep it
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          disabled={busy}
          className={cn("flex-1 sm:flex-none", PRESS)}
        >
          <Busy busy={busy}>Delete</Busy>
        </Button>
      </div>
    </div>
  );
}

/** Keeps a notice up for six seconds, then clears it. */
export function useNotice() {
  const [notice, setNotice] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return [notice, setNotice] as const;
}
