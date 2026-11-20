import { cn } from "cn";

import { clockToMinutes, formatClock } from "../constants";

// Building blocks the availability page shares: the section card, form
// messages, switches, segmented choices and the small pictures of a day.

const FOCUS = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** One section of the availability page, with an anchor for the section nav. */
export function Panel({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-48 rounded-2xl border border-border bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="max-w-2xl">
          <h2 id={`${id}-title`} className="font-display text-2xl font-bold text-navy-900">
            {title}
          </h2>
          <p className="mt-1 text-base text-slate-600">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export type FormState = { kind: "idle" } | { kind: "success" | "error"; message: string };

/** Success and error messages under a form. Screen readers hear them as they change. */
export function FormMessage({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state.kind === "success" && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-green-600/30 bg-accent px-4 py-3 text-sm font-medium text-green-800"
        >
          <span aria-hidden="true">✓ </span>
          {state.message}
        </p>
      )}
      {state.kind === "error" && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

/** A checkbox with a 44px touch target. */
export function CheckField({
  id,
  label,
  checked,
  onChange,
  disabled,
  className,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-navy-900",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 accent-green-700"
      />
      {label}
    </label>
  );
}

/** An on/off switch with its label beside it, 44px tall. */
export function SwitchField({
  id,
  label,
  checked,
  onChange,
  disabled,
  className,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-h-11 items-center gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          // A 44px hit area around the 28px track.
          "before:absolute before:-inset-2 before:content-['']",
          checked ? "bg-green-700" : "bg-slate-300 hover:bg-slate-400",
          FOCUS,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
            checked && "translate-x-5",
          )}
        />
      </button>
      <label
        id={`${id}-label`}
        htmlFor={id}
        className={cn(
          "cursor-pointer text-base font-semibold text-navy-900",
          disabled && "cursor-not-allowed",
        )}
      >
        {label}
      </label>
    </span>
  );
}

/** A few mutually exclusive choices as one pill row (radio buttons underneath). */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  name: string;
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <fieldset disabled={disabled} className={cn("min-w-0", className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex rounded-full bg-muted p-1">
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0 flex-1">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold whitespace-nowrap text-slate-600 transition-colors sm:px-4",
                "peer-checked:bg-white peer-checked:text-navy-900 peer-checked:shadow-xs hover:text-navy-900",
                "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The hours a day timeline spans: 6 AM to 10 PM, wider when a day needs it. */
export function timelineSpan(days: ReadonlyArray<{ opens: string; closes: string }>) {
  let from = 6 * 60;
  let to = 22 * 60;
  for (const day of days) {
    from = Math.min(from, Math.floor(clockToMinutes(day.opens) / 60) * 60);
    to = Math.max(to, Math.ceil(clockToMinutes(day.closes) / 60) * 60);
  }
  return { from, to };
}

/**
 * One day drawn as a bar: open in green, the break as a gap. Decorative; the
 * times are always written beside it.
 */
export function DayTimeline({
  opens,
  closes,
  breakStart,
  breakEnd,
  span,
  className,
}: {
  opens: string;
  closes: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  span: { from: number; to: number };
  className?: string;
}) {
  const width = span.to - span.from;
  const pct = (time: string) =>
    `${Math.min(100, Math.max(0, ((clockToMinutes(time) - span.from) / width) * 100))}%`;
  const valid = closes > opens;
  return (
    <div aria-hidden="true" className={cn("relative h-2.5 rounded-full bg-muted", className)}>
      {valid && (
        <div
          className="absolute inset-y-0 rounded-full bg-green-600"
          style={{ left: pct(opens), right: `calc(100% - ${pct(closes)})` }}
        />
      )}
      {valid && breakStart && breakEnd && breakEnd > breakStart && (
        <div
          className="absolute -inset-y-px bg-[repeating-linear-gradient(135deg,var(--color-white)_0_3px,var(--color-slate-300)_3px_5px)]"
          style={{ left: pct(breakStart), right: `calc(100% - ${pct(breakEnd)})` }}
        />
      )}
    </div>
  );
}

/** "9 AM – 6 PM", dropping ":00". */
export function hoursLabel(opens: string, closes: string) {
  const short = (time: string) => formatClock(time).replace(":00", "");
  return `${short(opens)} – ${short(closes)}`;
}

/** Hours open across a week, less breaks. */
export function weeklyMinutes(
  days: ReadonlyArray<{
    opens: string;
    closes: string;
    breakStart: string | null;
    breakEnd: string | null;
  }>,
) {
  return days.reduce((total, day) => {
    const open = clockToMinutes(day.closes) - clockToMinutes(day.opens);
    const rest =
      day.breakStart && day.breakEnd
        ? clockToMinutes(day.breakEnd) - clockToMinutes(day.breakStart)
        : 0;
    return total + Math.max(0, open - Math.max(0, rest));
  }, 0);
}

export function formatWeekHours(minutes: number) {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"} a week`;
}

/** A calendar-page date: "DEC" over "25". */
export function DateTile({
  month,
  day,
  muted,
}: {
  month: string | null;
  day: string | null;
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border",
        muted ? "border-dashed border-border bg-white" : "border-border bg-neutral-50",
      )}
    >
      <span className="text-xs font-bold tracking-wide text-green-700 uppercase">
        {month ?? "TBA"}
      </span>
      <span className="font-display text-xl leading-none font-bold text-navy-900">
        {day ?? "–"}
      </span>
    </span>
  );
}

export const fieldLabel = "mb-1 block text-sm font-medium text-navy-900";
export const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";
