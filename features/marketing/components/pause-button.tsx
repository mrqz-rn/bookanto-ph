"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";

/** The round pause control for a card whose picture keeps moving. Freezes the frame in place. */
export function PauseButton() {
  const [paused, setPaused] = useState(false);

  return (
    <button
      type="button"
      className="mk-pause"
      aria-label="Pause animation"
      aria-pressed={paused}
      onClick={(event) => {
        const card = event.currentTarget.closest(".mk-loop");
        card?.toggleAttribute("data-paused", !paused);
        setPaused(!paused);
      }}
    >
      <span>
        {paused ? (
          <Play aria-hidden className="size-3.5 fill-current" />
        ) : (
          <Pause aria-hidden className="size-3.5 fill-current" />
        )}
      </span>
    </button>
  );
}
