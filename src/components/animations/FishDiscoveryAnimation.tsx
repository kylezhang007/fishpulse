import { motion, useReducedMotion } from "motion/react";
import { SpeciesIcon } from "./SpeciesIcon";

/** Confetti pieces: hearts, stars and water droplets in the brand palette. */
const CONFETTI = [
  { glyph: "heart", color: "#ff6b81", angle: -150, dist: 62 },
  { glyph: "star", color: "#ffb020", angle: -120, dist: 74 },
  { glyph: "drop", color: "#3fb2ff", angle: -95, dist: 58 },
  { glyph: "heart", color: "#ff8fb1", angle: -70, dist: 70 },
  { glyph: "star", color: "#a78bfa", angle: -40, dist: 64 },
  { glyph: "drop", color: "#5cc8ff", angle: -15, dist: 52 },
  { glyph: "star", color: "#2fd39a", angle: -170, dist: 50 },
  { glyph: "drop", color: "#7fd3ff", angle: -5, dist: 40 },
  { glyph: "heart", color: "#ff6b81", angle: -110, dist: 44 },
  { glyph: "star", color: "#ffb020", angle: -60, dist: 46 },
] as const;

function Glyph({ glyph, color }: { glyph: "heart" | "star" | "drop"; color: string }) {
  if (glyph === "heart")
    return (
      <svg width="14" height="13" viewBox="0 0 24 22">
        <path d="M12 21s-9-5.6-11-11.2C-.4 5.3 3 1 7 1c2.3 0 4 1.4 5 3 1-1.6 2.7-3 5-3 4 0 7.4 4.3 6 8.8C21 15.4 12 21 12 21Z" fill={color} />
      </svg>
    );
  if (glyph === "star")
    return (
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path d="M12 1.5c.6 4.7 2.6 7.6 9.5 10.5-6.9 2.9-8.9 5.8-9.5 10.5-.6-4.7-2.6-7.6-9.5-10.5C9.4 9.1 11.4 6.2 12 1.5Z" fill={color} />
      </svg>
    );
  return (
    <svg width="10" height="13" viewBox="0 0 20 26">
      <path d="M10 1s9 10 9 15.5A9 9 0 0 1 1 16.5C1 11 10 1 10 1Z" fill={color} />
    </svg>
  );
}

/**
 * "Fish Spotted!" celebration (~1.8 s): the fish hops out with a squash-and-stretch,
 * hearts, stars and droplets pop out, a "Nice catch!" bubble appears, and the fish
 * plops back into the marker with a splash. Rendered inside the marker element so
 * it originates from the real map coordinate.
 */
export function FishDiscoveryAnimation({ color, species }: { color: string; species: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {/* soft glow */}
      <motion.span
        className="absolute rounded-full"
        style={{ width: 110, height: 110, background: `radial-gradient(circle, #fff 0%, ${color}66 35%, transparent 70%)` }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.3], opacity: [0, 1, 0] }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
      />

      {/* confetti */}
      {CONFETTI.map((c, i) => {
        const rad = (c.angle * Math.PI) / 180;
        return (
          <motion.span
            key={i}
            className="absolute"
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }}
            animate={{
              x: Math.cos(rad) * c.dist,
              y: [0, Math.sin(rad) * c.dist, Math.sin(rad) * c.dist + 18],
              scale: [0, 1.2, 0.9],
              rotate: i % 2 ? 40 : -40,
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 1.25, delay: 0.32 + (i % 5) * 0.03, ease: "easeOut" }}
          >
            <Glyph glyph={c.glyph} color={c.color} />
          </motion.span>
        );
      })}

      {/* the hopping fish (squash & stretch) */}
      <motion.span
        className="absolute"
        style={{ filter: "drop-shadow(0 6px 8px rgba(35,49,77,0.25))" }}
        initial={{ y: 8, scaleX: 1.3, scaleY: 0.6, rotate: -30, opacity: 0 }}
        animate={{
          y: [8, -58, -64, -58, 0],
          scaleX: [1.3, 0.85, 1, 1, 1.25],
          scaleY: [0.6, 1.2, 1, 1, 0.7],
          rotate: [-30, -10, 10, 25, 50],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{ duration: 1.4, times: [0, 0.32, 0.5, 0.68, 1], ease: "easeInOut" }}
      >
        <SpeciesIcon species={species} size={50} />
      </motion.span>

      {/* "Nice catch!" speech bubble */}
      <motion.span
        className="absolute -top-16 rounded-full bg-white px-2.5 py-1 font-display text-[13px] font-extrabold whitespace-nowrap shadow-lg"
        style={{ color }}
        initial={{ y: 10, scale: 0, opacity: 0 }}
        animate={{ y: [10, -14, -16, -20], scale: [0, 1.15, 1, 0.9], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.7, times: [0, 0.25, 0.75, 1], delay: 0.25 }}
      >
        Nice catch! ✨
      </motion.span>

      {/* splash when it plops back in */}
      <motion.span
        className="absolute rounded-full border-[3px]"
        style={{ width: 34, height: 34, borderColor: color }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 2.2], opacity: [1, 0] }}
        transition={{ duration: 0.6, delay: 1.3, ease: "easeOut" }}
      />
    </span>
  );
}
