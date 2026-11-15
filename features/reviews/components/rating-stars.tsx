"use client";

import * as React from "react";
import { Star } from "lucide-react";

type RatingStarsProps = {
  /** Current value between 1 and 5. Null or 0 means unselected. */
  value?: number;
  /** When provided, renders interactive selector; otherwise read-only display. */
  onChange?: (rating: number) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
};

const STAR_DESCRIPTIONS: Record<number, string> = {
  1: "1 star - Poor / Dissatisfied",
  2: "2 stars - Fair / Could be better",
  3: "3 stars - Good / Average",
  4: "4 stars - Very good / Satisfied",
  5: "5 stars - Excellent / Highly recommended",
};

export function RatingStars({
  value = 0,
  onChange,
  size = "md",
  label,
  disabled = false,
}: RatingStarsProps) {
  const isInteractive = !!onChange && !disabled;
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : value;

  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  }[size];

  const buttonPaddingClasses = {
    sm: "p-2 min-h-[44px] min-w-[44px]",
    md: "p-2.5 min-h-[44px] min-w-[44px]",
    lg: "p-3 min-h-[48px] min-w-[48px]",
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (!isInteractive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(star);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(5, (value || 0) + 1);
      onChange(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const prev = Math.max(1, (value || 1) - 1);
      onChange(prev);
    } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
      e.preventDefault();
      onChange(Number(e.key));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold text-slate-700">{label}</span>}
      <div
        role={isInteractive ? "radiogroup" : "img"}
        aria-label={label || `Rating: ${value} out of 5 stars`}
        className="flex items-center gap-0.5"
        onMouseLeave={() => isInteractive && setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = displayRating >= star;
          const isSelected = value === star;

          if (!isInteractive) {
            return (
              <Star
                key={star}
                aria-hidden="true"
                className={`${sizeClasses} ${
                  filled ? "fill-amber-400 text-amber-500" : "fill-slate-100 text-slate-300"
                } transition-colors`}
              />
            );
          }

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={STAR_DESCRIPTIONS[star]}
              title={STAR_DESCRIPTIONS[star]}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              className={`${buttonPaddingClasses} inline-flex items-center justify-center rounded-lg text-slate-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 active:scale-95`}
            >
              <Star
                aria-hidden="true"
                className={`${sizeClasses} ${
                  filled
                    ? "scale-105 fill-amber-400 text-amber-500"
                    : "fill-slate-100 text-slate-300 hover:text-slate-400"
                } transition-all`}
              />
            </button>
          );
        })}
      </div>
      {isInteractive && (
        <p className="min-h-[1.25rem] text-xs font-medium text-slate-500 transition-all">
          {displayRating > 0 ? STAR_DESCRIPTIONS[displayRating] : "Tap a star to rate"}
        </p>
      )}
    </div>
  );
}
