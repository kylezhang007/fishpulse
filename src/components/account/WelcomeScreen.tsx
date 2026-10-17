import { motion } from "motion/react";
import { useState } from "react";
import { FishIcon } from "../animations/FishIcon";
import { JoinForm } from "./JoinForm";

/** First run on a device: join with the shared invite code, or browse as a guest. */
export function WelcomeScreen({
  onJoin,
  onGuest,
  checkName,
}: {
  onJoin: (code: string, name: string) => Promise<unknown>;
  onGuest: () => Promise<unknown>;
  checkName: (name: string) => Promise<boolean>;
}) {
  const [guestBusy, setGuestBusy] = useState(false);
  return (
    <motion.div
      className="absolute inset-0 z-50 overflow-y-auto bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+24px)] backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: "none" }}
      role="dialog"
      aria-label="Welcome to FishPulse"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <motion.div
          className="fp-logo"
          style={{ width: 84, height: 84, borderRadius: 28 }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 12 }}
        >
          <FishIcon size={58} color="#fff" className="fp-bob" />
        </motion.div>
        <h1 className="fp-brand mt-4 font-display text-[34px] leading-none font-extrabold">FishPulse</h1>
        <p className="mt-2 text-sm font-semibold text-ink-soft">Find the fish. Alert your crew. Fish together.</p>

        <div className="glass mt-6 w-full rounded-[26px] p-4">
          <p className="mb-3 text-left font-display text-lg font-extrabold text-ink">🎟️ Join with an invite code</p>
          <JoinForm onJoin={onJoin} checkName={checkName} />
        </div>

        <button
          className="mt-4 text-sm font-extrabold text-sky disabled:opacity-60"
          disabled={guestBusy}
          onClick={async () => {
            setGuestBusy(true);
            try {
              await onGuest();
            } finally {
              setGuestBusy(false);
            }
          }}
        >
          {guestBusy ? "Opening…" : "No code? Continue as a guest →"}
        </button>
        <p className="mt-1 text-[11px] font-semibold text-ink-mute">Guests can explore the map and community, but can't post or use Fish ID.</p>
      </div>
    </motion.div>
  );
}
