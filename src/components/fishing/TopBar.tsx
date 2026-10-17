import { motion } from "motion/react";
import type { ConnectionStatus } from "../../types/fishing";
import { FishIcon } from "../animations/FishIcon";

const STATUS_COPY: Record<ConnectionStatus, { label: string; dot: string }> = {
  connecting: { label: "Connecting", dot: "bg-sun" },
  live: { label: "Live", dot: "bg-mint" },
  reconnecting: { label: "Reconnecting", dot: "bg-sun" },
  offline: { label: "Offline", dot: "bg-coral" },
};

export function TopBar({
  mode,
  connection,
  activeCount,
  syncScope,
}: {
  mode: "demo" | "live";
  connection: ConnectionStatus;
  activeCount: number;
  syncScope: string;
}) {
  const s = STATUS_COPY[connection];
  return (
    <header className="glass flex items-center justify-between gap-3 rounded-[26px] py-2 pr-2.5 pl-2">
      <div className="flex items-center gap-2.5">
        <span className="fp-logo" aria-hidden="true">
          <FishIcon size={26} color="#fff" className="fp-bob" />
        </span>
        <div className="leading-none">
          <h1 className="fp-brand font-display text-[22px] font-extrabold tracking-tight">FishPulse</h1>
          <p className="mt-0.5 text-[11px] font-bold text-ink-mute">Share the bite 🎣</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5" title={syncScope}>
        {mode === "demo" && (
          <span className="rounded-full bg-sun-soft px-2 py-1 text-[10px] font-black tracking-wide text-[#c98500] uppercase">Demo</span>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-[#f2f5fa] px-2.5 py-1 text-xs font-bold text-ink-soft" aria-live="polite">
          <span className="relative flex h-2 w-2">
            {connection === "live" && <span className={`absolute inset-0 animate-ping rounded-full ${s.dot} opacity-60`} />}
            <span className={`relative h-2 w-2 rounded-full ${s.dot}`} />
          </span>
          {mode === "demo" && connection === "live" ? "Local" : s.label}
          <motion.span
            key={activeCount}
            initial={{ scale: 1.8, color: "#ff6b81" }}
            animate={{ scale: 1, color: "#23314d" }}
            transition={{ type: "spring", stiffness: 500, damping: 12 }}
            className="ml-0.5 inline-block font-black tabular-nums"
          >
            {activeCount}
          </motion.span>
          <span aria-hidden="true">🐟</span>
        </span>
      </div>
    </header>
  );
}
