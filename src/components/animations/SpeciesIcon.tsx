import type { ReactNode } from "react";
import { FishIcon } from "./FishIcon";

/**
 * Cartoon icon per species (approved designs, 2026-10-16). All share the mascot's
 * face — big shiny eye, blush, smile — and face right. viewBox is 80×56.
 * Unknown species (e.g. older reports) fall back to the generic mascot.
 */

const Eye = ({ x, y, r = 4.5 }: { x: number; y: number; r?: number }) => (
  <>
    <circle cx={x} cy={y} r={r} fill="#fff" />
    <circle cx={x + 1} cy={y + 0.3} r={r * 0.63} fill="#23314D" />
    <circle cx={x + 2} cy={y - 0.8} r={r * 0.22} fill="#fff" />
  </>
);

const ART: Record<string, ReactNode> = {
  Bass: (
    <>
      <path d="M15 28 L4 16 Q2 14 3 18 L6 28 L3 38 Q2 42 4 40 Z" fill="#4E9A43" />
      <path d="M25 15 L28 6 L31 13 L34 5 L37 13 L40 5 L43 13 L46 7 L49 14 Z" fill="#3F8F3A" />
      <ellipse cx="42" cy="29" rx="28" ry="16" fill="#6BBF59" />
      <path d="M15 27 Q30 12 52 13 Q64 14 69 24 Q55 18 40 19 Q26 20 15 27 Z" fill="#4E9A43" />
      <ellipse cx="44" cy="38" rx="18" ry="5.5" fill="#E8F5D0" />
      <path
        d="M19 29 L25 26.5 L30 30.5 L36 26.5 L42 30.5 L48 26.5 L53 29.5"
        stroke="#2F6B2B"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M44 33 Q39 41 46 42 Q49 38 48 33 Z" fill="#4E9A43" />
      <path d="M70.5 26 Q67 34 58 33 Q64 38.5 70.5 33.5 Z" fill="#23314D" />
      <Eye x={58} y={22.5} r={4.6} />
      <ellipse cx="52" cy="29" rx="2.6" ry="1.6" fill="#FF8FA3" opacity=".85" />
    </>
  ),
  Trout: (
    <>
      <path d="M15 28 Q6 18 3 20 Q5 28 3 36 Q6 38 15 28 Z" fill="#8FAE73" />
      <circle cx="7" cy="24" r="1" fill="#4B5B3E" />
      <circle cx="8" cy="32" r="1" fill="#4B5B3E" />
      <path d="M33 16 Q38 8 46 15 Z" fill="#8FAE73" />
      <ellipse cx="42" cy="28" rx="29" ry="13" fill="#C9DDB0" />
      <path d="M14 27 Q30 15 50 15.5 Q64 16 70 25 Q56 20 42 21 Q26 22 14 27 Z" fill="#8FAE73" />
      <ellipse cx="44" cy="36" rx="19" ry="4.5" fill="#F7F4EA" />
      <path d="M17 28.5 Q42 23 69 28.5 Q42 34 17 28.5 Z" fill="#FF8FA8" />
      {[
        [24, 22],
        [30, 19],
        [36, 21],
        [43, 18],
        [49, 20.5],
        [27, 25],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.1" fill="#4B5B3E" />
      ))}
      <Eye x={59} y={23} r={4.4} />
      <path d="M64 31 Q66.5 33 69 31" stroke="#23314D" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="55" cy="30.5" rx="2.4" ry="1.5" fill="#FF6B8A" opacity=".8" />
    </>
  ),
  Salmon: (
    <>
      <path d="M15 28 L2 14 Q7 22 8 28 Q7 34 2 42 Z" fill="#6C8FB8" />
      <path d="M32 16 L37 7 L45 15 Z" fill="#6C8FB8" />
      <ellipse cx="42" cy="28" rx="29" ry="14" fill="#FFB3A1" />
      <path d="M14 27 Q30 13 50 14 Q64 15 70 24 Q56 19 42 20 Q26 21 14 27 Z" fill="#6C8FB8" />
      <ellipse cx="44" cy="37" rx="19" ry="4.8" fill="#FFF1EC" />
      {[
        [25, 21],
        [31, 18],
        [38, 19.5],
        [45, 17],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" fill="#2E4566" />
      ))}
      <path d="M44 32 Q40 39 46 40 Q48 36 48 32 Z" fill="#FF8F7A" />
      <path d="M70.5 29 Q71 34 67 35 Q68.5 32 66.5 31" stroke="#23314D" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Eye x={59} y={23} r={4.4} />
      <ellipse cx="55" cy="30" rx="2.4" ry="1.5" fill="#FF6B8A" opacity=".8" />
    </>
  ),
  Catfish: (
    <>
      <path d="M14 30 Q5 20 3 23 Q5 30 3 37 Q5 40 14 30 Z" fill="#7C8DA8" />
      <path d="M36 18 L40 9 L46 17 Z" fill="#7C8DA8" />
      <path d="M12 30 Q14 18 40 17 Q62 16 70 26 Q73 31 70 35 Q62 42 40 42 Q16 42 12 30 Z" fill="#93A3BC" />
      <ellipse cx="42" cy="37.5" rx="20" ry="4.2" fill="#E3E8F1" />
      {["M66 33 Q74 37 76 46", "M68 31 Q77 30 79 37", "M63 35 Q65 44 60 50", "M63 22 Q68 13 75 14"].map((d) => (
        <path key={d} d={d} stroke="#5E6E88" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ))}
      <path d="M62 32 Q66.5 35.5 71 32" stroke="#23314D" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <Eye x={58} y={25} r={3.6} />
      <ellipse cx="53" cy="31" rx="2.4" ry="1.5" fill="#FF8FA3" opacity=".8" />
    </>
  ),
};

export function hasSpeciesIcon(species: string): boolean {
  return species in ART;
}

/** `size` is the rendered width in px; height follows the 80×56 aspect ratio. */
export function SpeciesIcon({ species, size = 30, className }: { species: string; size?: number; className?: string }) {
  const art = ART[species];
  if (!art) return <FishIcon size={size * 0.8} color="#3fb2ff" className={className} />;
  return (
    <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 80 56" className={className} aria-hidden="true">
      {art}
    </svg>
  );
}
