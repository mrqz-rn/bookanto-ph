import * as React from "react";
import { cn } from "cn";

/** The one card style of the analytics screens. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-5 shadow-2xs sm:p-6", className)}
      {...props}
    />
  );
}

type PanelHeaderProps = {
  id?: string;
  title: string;
  description?: string;
  /** A figure or control shown at the right from 640px, under the title below. */
  aside?: React.ReactNode;
};

export function PanelHeader({ id, title, description, aside }: PanelHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-lg font-bold text-foreground sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/** A message in place of a chart that has nothing to draw yet. */
export function EmptyChart({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      {children ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}

/** A two-option switch for a chart's view, 44px tall on touch screens. */
export function SegmentedSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-muted p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 rounded-md px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] active:scale-[0.97] lg:h-9",
              isActive
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
