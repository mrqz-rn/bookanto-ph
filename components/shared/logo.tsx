import type { ComponentProps } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// The BooKanto street-sign logo, drawn from the primary logo on the logo
// canvas: a navy post with a green BOOK sign and a navy KANTO sign. The app
// icons in app/ and public/icons are rendered from the same artwork.

const signText = {
  textAnchor: "middle",
  dominantBaseline: "central",
  fontFamily: "var(--font-fredoka), ui-rounded, sans-serif",
  fontWeight: 700,
  fontSize: 32,
  letterSpacing: 3,
} as const;

/** The street-sign mark. Decorative by default; pass aria-label to make it an image. */
export function LogoMark({ className, ...props }: ComponentProps<"svg">) {
  const labelled = props["aria-label"] !== undefined;
  return (
    <svg
      viewBox="10 18 180 184"
      className={cn("h-10 w-auto", className)}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      {...props}
    >
      <rect x="92" y="20" width="16" height="180" rx="8" fill="#14213D" />
      <g transform="rotate(-6 100 60)">
        <rect x="14" y="34" width="172" height="52" rx="10" fill="#16A34A" />
        <text x="100" y="61" fill="#14213D" {...signText}>
          BOOK
        </text>
      </g>
      <g transform="rotate(5 100 126)">
        <rect x="14" y="100" width="172" height="52" rx="10" fill="#14213D" />
        <text x="100" y="127" fill="#FFFFFF" {...signText}>
          KANTO
        </text>
      </g>
    </svg>
  );
}

/** "BooKanto" in Fredoka Bold with the green K. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-[-0.015em] text-navy-900", className)}>
      Boo<span className="text-green-600">K</span>anto
    </span>
  );
}

/** Complete brand lockup (LogoMark + Wordmark) wrapped in a link to homepage. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <LogoMark className="h-9" />
      <Wordmark className="text-xl" />
    </Link>
  );
}
