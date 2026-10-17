import { motion } from "motion/react";
import { FishIcon } from "../animations/FishIcon";

const COPY = {
  community: {
    title: "Community is coming soon",
    emoji: "👥",
    color: "#a78bfa",
    lines: ["Follow your fishing crew", "See today's best catches & photos", "Cheer on reports with 👍 \"still biting!\""],
  },
  chat: {
    title: "Chat is coming soon",
    emoji: "💬",
    color: "#3fb2ff",
    lines: ["Message anglers who shared a spot", "Group chats for your crew", "\"I'm heading over!\" in one tap"],
  },
} as const;

/** Honest placeholder for tabs that aren't built yet — nothing here pretends to work. */
export function ComingSoon({ tab, onBack }: { tab: keyof typeof COPY; onBack: () => void }) {
  const c = COPY[tab];
  return (
    <motion.section
      key={tab}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-cream px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+96px)] text-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      aria-labelledby={`soon-${tab}`}
    >
      {/* floating bubbles backdrop */}
      {[...Array(7)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-2 bg-white/60"
          style={{ width: 14 + (i % 3) * 10, height: 14 + (i % 3) * 10, left: `${8 + i * 13}%`, bottom: -40, borderColor: `${c.color}55` }}
          animate={{ y: [0, -900], x: [0, i % 2 ? 20 : -20, 0] }}
          transition={{ duration: 9 + i, repeat: Infinity, delay: i * 1.1, ease: "linear" }}
          aria-hidden="true"
        />
      ))}

      <div className="relative z-10 flex w-full flex-col items-center">
      <motion.div
        className="relative grid h-36 w-36 place-items-center rounded-full"
        style={{ background: `${c.color}22` }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <FishIcon size={92} color={c.color} />
        <span className="absolute -top-1 -right-1 grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-lg">{c.emoji}</span>
      </motion.div>

      <h2 id={`soon-${tab}`} className="mt-6 font-display text-[28px] leading-tight font-extrabold text-ink">
        {c.title}
      </h2>
      <p className="mt-1 text-sm font-semibold text-ink-soft">We're still building this part. Here's what's swimming your way:</p>

      <ul className="mt-5 w-full max-w-xs space-y-2 text-left">
        {c.lines.map((l, i) => (
          <motion.li
            key={l}
            className="glass flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-ink"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs text-white" style={{ background: c.color }}>
              {i + 1}
            </span>
            {l}
          </motion.li>
        ))}
      </ul>

      <button className="btn-sky mt-7" onClick={onBack}>
        🗺️ Back to the map
      </button>
      </div>
    </motion.section>
  );
}
