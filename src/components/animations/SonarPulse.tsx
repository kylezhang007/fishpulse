import type { CSSProperties } from "react";

/**
 * Soft water ripples. Rendered inside a map marker element, so they're always
 * anchored to the real coordinate while the map pans/zooms.
 *
 * mode="burst" → 3 ripples + sparkle flash, plays once (new report)
 * mode="idle"  → 1 slow ripple, loops (hot spots only — keeps GPU cost low)
 */
export function SonarPulse({ color, mode = "burst", size = 140 }: { color: string; mode?: "burst" | "idle"; size?: number }) {
  const rings = mode === "burst" ? [0, 320, 640] : [0];
  return (
    <span className="fp-sonar" aria-hidden="true" style={{ "--fp-ring": color, "--fp-size": `${size}px` } as CSSProperties}>
      {rings.map((delay) => (
        <span
          key={delay}
          className={mode === "burst" ? "fp-ring fp-ring--burst" : "fp-ring fp-ring--idle"}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
      {mode === "burst" && <span className="fp-sonar-flash" />}
    </span>
  );
}

/** A few bubbles rising from lively spots. */
export function Bubbles() {
  return (
    <span className="fp-bubbles" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
