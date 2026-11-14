import { cn } from "cn";

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
      className="scroll-mt-48 rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={`${id}-title`} className="font-display text-xl font-bold text-navy-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
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
          className="mt-3 rounded-md border border-success/30 bg-accent px-3 py-2 text-sm font-medium text-green-800"
        >
          <span aria-hidden="true">✓ </span>
          {state.message}
        </p>
      )}
      {state.kind === "error" && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger"
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

export const fieldLabel = "mb-1 block text-sm font-medium text-navy-900";
export const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";
