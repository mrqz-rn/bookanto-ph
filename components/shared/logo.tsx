import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// The pin-and-check mark from the BooKanto logo canvas. The final logo is
// still being chosen; when it is, replace this, app/icon.svg and public/icons.

/** The map-pin mark. Decorative by default; pass aria-label to make it an image. */
export function LogoMark({ className, ...props }: ComponentProps<"svg">) {
  const labelled = props["aria-label"] !== undefined;
  return (
    <svg
      viewBox="0 0 100 120"
      className={cn("h-10 w-auto", className)}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      {...props}
    >
      <path
        d="M50 4C26.8 4 8 22.8 8 46c0 30 42 70 42 70s42-40 42-70C92 22.8 73.2 4 50 4z"
        fill="#F26B1D"
      />
      <circle cx="50" cy="46" r="26" fill="#14213D" />
      <path
        d="M37 47l9 9 18-19"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "BooKanto" with the orange K. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display tracking-tight text-navy-900", className)}>
      Boo<span className="text-orange-500">K</span>anto
    </span>
  );
}
