import type { ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

// The BooKanto "K" app icon: a navy tile with a white stem, a ringed joint and
// green arms. public/brand/bookanto-icon.svg and the PNG icons in app/ and
// public/icons are rendered from the same drawing, so keep them in step.

const NAVY = "#14213D";
const GREEN = "#16A34A";

/** The K app-icon mark. Decorative by default; pass aria-label to make it an image. */
export function LogoMark({ className, ...props }: ComponentProps<"svg">) {
  const labelled = props["aria-label"] !== undefined;
  return (
    <svg
      viewBox="0 0 144 144"
      className={cn("aspect-square h-10 w-auto shrink-0", className)}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      {...props}
    >
      <rect width="144" height="144" rx="38" fill={NAVY} />
      <path d="M105 30 63 72" stroke={GREEN} strokeWidth="20.5" strokeLinecap="round" />
      <path
        d="M66 62.62 114.5 111.12V123.5h-12.38L56 77.38z"
        fill={GREEN}
        stroke={GREEN}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="36" y="25" width="22" height="94" rx="11" fill="#fff" />
      <circle cx="63" cy="72" r="15.5" fill="#fff" />
      <circle cx="63" cy="72" r="9.5" fill={NAVY} />
    </svg>
  );
}

// Intrinsic size of public/brand/bookanto-wordmark.png (3x a 44px slot).
const WORDMARK_WIDTH = 756;
const WORDMARK_HEIGHT = 132;

/**
 * The "BooKanto" wordmark artwork. Its height is 1em, so size it with a
 * text-* class the way you would size type.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      {/* Already sized to 3x and palette-compressed, so skip the optimizer. */}
      <Image
        src="/brand/bookanto-wordmark.png"
        width={WORDMARK_WIDTH}
        height={WORDMARK_HEIGHT}
        alt="BooKanto"
        loading="eager"
        unoptimized
        className="h-[1em] w-auto"
      />
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
