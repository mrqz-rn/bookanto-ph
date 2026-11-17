"use client";

import { useEffect, useRef } from "react";

const FILTER_ID = "mk-liquid";

/**
 * The name set across the closing section. Under a fine pointer it ripples like
 * type seen through water and settles back to crisp type within about a second.
 * The SVG filter is applied only while it moves; touch screens and reduced
 * motion get the still name.
 */
export function LiquidWordmark() {
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const noiseRef = useRef<SVGFETurbulenceElement>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const text = textRef.current;
    const noise = noiseRef.current;
    const map = mapRef.current;
    if (!svg || !text || !noise || !map) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let energy = 0;
    let scale = 0;
    let phase = 0;
    let frame = 0;
    let lastX = 0;
    let lastY = 0;

    const tick = () => {
      energy *= 0.88;
      scale += (energy - scale) * 0.2;
      phase += 0.03;
      noise.setAttribute(
        "baseFrequency",
        `${(0.006 + Math.sin(phase) * 0.0015).toFixed(4)} ${(0.05 + Math.cos(phase) * 0.01).toFixed(4)}`,
      );
      map.setAttribute("scale", scale.toFixed(2));
      if (energy < 0.05 && scale < 0.05) {
        map.setAttribute("scale", "0");
        text.style.removeProperty("filter");
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      lastX = event.clientX;
      lastY = event.clientY;
      energy = Math.min(36, energy + Math.min(distance, 40) * 0.5);
      text.style.filter = `url(#${FILTER_ID})`;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    svg.addEventListener("pointermove", onMove);
    return () => {
      svg.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 1000 178" className="mk-wordmark" aria-hidden="true">
      <defs>
        <filter id={FILTER_ID} x="-4%" y="-25%" width="108%" height="150%">
          <feTurbulence
            ref={noiseRef}
            type="fractalNoise"
            baseFrequency="0.006 0.05"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            ref={mapRef}
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <text
        ref={textRef}
        x="0"
        y="166"
        textLength="1000"
        lengthAdjust="spacingAndGlyphs"
        fill="#14213D"
        style={{
          fontFamily: "var(--font-fredoka), ui-rounded, sans-serif",
          fontWeight: 700,
          fontSize: 228,
        }}
      >
        Boo<tspan fill="#16A34A">K</tspan>anto
      </text>
    </svg>
  );
}
