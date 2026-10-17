import { motion } from "motion/react";
import { FISH_SPECIES } from "../../types/fishing";
import { FishIcon } from "../animations/FishIcon";

/** Map actions row: species filter · Fish Spotted! · demo simulator. Sits above the tab bar. */
export function BottomBar({
  filter,
  onFilterChange,
  onReport,
  onSimulate,
  simulating,
}: {
  filter: string;
  onFilterChange: (f: string) => void;
  onReport: () => void;
  /** Only provided in Demo Mode. */
  onSimulate?: () => void;
  simulating: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="glass relative flex h-11 min-w-0 items-center gap-1 rounded-full pr-2.5 pl-3 text-xs">
        <span aria-hidden="true">🔍</span>
        <span className="sr-only">Filter by species</span>
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-[64px] appearance-none truncate bg-transparent font-extrabold text-ink outline-none sm:w-auto"
        >
          <option value="all">All fish</option>
          {FISH_SPECIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="text-ink-mute">▾</span>
      </label>

      <motion.button
        className="fp-cta"
        onClick={onReport}
        whileTap={{ scale: 0.9, rotate: -2 }}
        whileHover={{ scale: 1.04, rotate: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
      >
        <span className="fp-cta-glow" aria-hidden="true" />
        <span className="fp-cta-icon">
          <FishIcon size={28} color="#ff6b81" className="fp-fish-wiggle" />
        </span>
        <span>Fish Spotted!</span>
      </motion.button>

      {onSimulate ? (
        <motion.button
          className="glass flex h-11 w-[74px] flex-col items-center justify-center rounded-full text-[10px] leading-tight font-bold text-ink-soft sm:w-auto sm:px-3"
          onClick={onSimulate}
          disabled={simulating}
          whileTap={{ scale: 0.9 }}
          title="Demo Mode: inject a sample sighting through the real event pipeline"
        >
          <span className="font-black text-[#c98500]">✨ Demo</span>
          <span>{simulating ? "Sending…" : "Simulate"}</span>
        </motion.button>
      ) : (
        <span className="w-[74px] sm:w-[110px]" aria-hidden="true" />
      )}
    </div>
  );
}
