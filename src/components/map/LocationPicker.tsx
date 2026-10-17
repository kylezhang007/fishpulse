import { motion } from "motion/react";
import { FishIcon } from "../animations/FishIcon";

/**
 * Fixed pin shown while choosing where to report. The map moves underneath; the pin
 * marks the map centre. In "rough area" mode the dashed circle shows the snapped
 * privacy cell the report will actually be published in (it hops between cells as
 * the map moves), sized to the real area at the current zoom.
 */
export function LocationPicker({ top, snap }: { top: number; snap: { dx: number; dy: number; r: number } | null }) {
  const d = snap ? Math.max(22, snap.r * 2) : 14;
  return (
    <div className="pointer-events-none absolute left-1/2 z-10" style={{ top }} aria-hidden="true">
      <span
        className={`absolute left-0 top-0 block rounded-full border-[3px] transition-[width,height,transform] duration-200 ease-out ${
          snap ? "border-dashed border-coral/70 bg-coral/15" : "border-white bg-coral"
        }`}
        style={{
          width: d,
          height: d,
          transform: `translate(${(snap?.dx ?? 0) - d / 2}px, ${(snap?.dy ?? 0) - d / 2}px)`,
        }}
      />
      <motion.div
        className="relative -translate-x-1/2 -translate-y-full"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
      >
        <svg width="46" height="58" viewBox="0 0 46 58" className="drop-shadow-[0_8px_10px_rgba(255,107,129,0.45)]">
          <path d="M23 57S5 35 5 22a18 18 0 1 1 36 0c0 13-18 35-18 35Z" fill="#ff6b81" stroke="#fff" strokeWidth="3" />
          <circle cx="23" cy="22" r="12" fill="#fff" />
        </svg>
        <span className="fp-bob absolute top-[10px] left-[11px]">
          <FishIcon size={24} color="#ff6b81" />
        </span>
      </motion.div>
    </div>
  );
}
