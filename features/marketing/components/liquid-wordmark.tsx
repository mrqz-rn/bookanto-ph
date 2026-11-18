"use client";

import { useEffect, useRef } from "react";

const FILTER_ID = "mk-liquid";
const NAVY = "#14213D";
const GREEN = "#16A34A";

// The K is the app icon's K (components/shared/logo.tsx), scaled so its stem
// is Fredoka Bold's cap height at 228px: icon units x 1.679, with the stem's
// foot on the baseline. "Boo" and "anto" are placed from Fredoka's measured
// advances (393.3 and 478.8 at 228px), so the K sits where Fredoka's own K
// would. The viewBox is cropped to the ink, so the name runs exactly from the
// wrap's left line to its right line.
const K_X = 399.3;
const ANTO_X = 539.6;

/**
 * "BooKanto" set across the closing section, white on navy with the brand K.
 * Under a fine pointer it ripples like type seen through water and settles
 * back within about a second. The SVG filter is applied only while it moves;
 * touch screens and reduced motion get the still name.
 */
export function LiquidWordmark() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const noiseRef = useRef<SVGFETurbulenceElement>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const group = groupRef.current;
    const noise = noiseRef.current;
    const map = mapRef.current;
    if (!svg || !group || !noise || !map) return;
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
        group.removeAttribute("filter");
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
      group.setAttribute("filter", `url(#${FILTER_ID})`);
      if (!frame) frame = requestAnimationFrame(tick);
    };

    svg.addEventListener("pointermove", onMove);
    return () => {
      svg.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const type = {
    fontFamily: "var(--font-fredoka), ui-rounded, sans-serif",
    fontWeight: 700,
    fontSize: 228,
  };

  return (
    <svg ref={svgRef} viewBox="6.8 -169 1008.4 181" className="mk-wordmark" aria-hidden="true">
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
      <g ref={groupRef}>
        <text x="0" y="0" fill="#fff" style={type}>
          Boo
        </text>
        <g transform={`translate(${K_X} 0)`}>
          <path
            d="M115.9 -149.4 45.3 -78.9"
            stroke={GREEN}
            strokeWidth="34.4"
            strokeLinecap="round"
          />
          <path
            d="M50.4 -94.7 131.8 -13.2V7.6H111L33.6 -70.1z"
            fill={GREEN}
            stroke={GREEN}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect x="0" y="-157.8" width="36.9" height="157.8" rx="18.5" fill="#fff" />
          <circle cx="45.3" cy="-78.9" r="26" fill="#fff" />
          <circle cx="45.3" cy="-78.9" r="15.9" fill={NAVY} />
        </g>
        <text x={ANTO_X} y="0" fill="#fff" style={type}>
          anto
        </text>
      </g>
    </svg>
  );
}
