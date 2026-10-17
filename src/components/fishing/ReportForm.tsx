import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { LIMITS } from "../../domain/validation";
import type { GeoState } from "../../hooks/useGeolocation";
import { ACTIVITY_LEVELS, ACTIVITY_META, FISH_SPECIES, type ActivityLevel } from "../../types/fishing";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { BottomSheet } from "../ui/BottomSheet";

/** One-tap notes — short and friendly. */
export const QUICK_MESSAGES = ["🔥 They're biting!", "🎣 Come fish with me!"] as const;

export interface ReportFormValues {
  fishType: string;
  activityLevel: ActivityLevel;
  note: string;
}

export function ReportForm({
  approximate,
  onApproximateChange,
  onUseMyLocation,
  geo,
  cooldownRemaining,
  onSubmit,
  onCancel,
  onHeightChange,
}: {
  approximate: boolean;
  onApproximateChange: (v: boolean) => void;
  onUseMyLocation: () => void;
  geo: GeoState;
  cooldownRemaining: number;
  onSubmit: (v: ReportFormValues) => Promise<void>;
  onCancel: () => void;
  onHeightChange: (h: number) => void;
}) {
  const [fishType, setFishType] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const missing = !fishType ? "Pick a fish first 🐟" : !activityLevel ? "How lively is it? 🎣" : null;
  const blocked = submitting || cooldownRemaining > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing || !activityLevel || blocked) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ fishType, activityLevel, note });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet label="Report a fishing hotspot" onHeightChange={onHeightChange}>
      <form onSubmit={handleSubmit} className="flex max-h-[min(56dvh,520px)] flex-col" noValidate>
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] leading-tight font-extrabold text-ink">Fish spotted! 🎉</h2>
            <p className="text-xs font-semibold text-ink-soft">Drag the map so the pin sits on your spot.</p>
          </div>
          <button type="button" onClick={onCancel} className="icon-btn icon-btn--sm" aria-label="Cancel report">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="-mx-4 mt-3 flex-1 space-y-3.5 overflow-x-hidden overflow-y-auto px-4 pb-1">
          {/* species */}
          <fieldset>
            <legend className="field-label">
              What's biting? {touched && !fishType && <span className="text-coral">· pick one</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {FISH_SPECIES.map((f) => (
                <motion.button
                  key={f}
                  type="button"
                  className="chip inline-flex shrink-0 items-center gap-1 pl-2"
                  data-on={fishType === f || undefined}
                  aria-pressed={fishType === f}
                  onClick={() => setFishType(f)}
                  whileTap={{ scale: 0.88 }}
                  animate={fishType === f ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <SpeciesIcon species={f} size={28} />
                  {f}
                </motion.button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-ink-mute">🐠 More species coming soon!</p>
          </fieldset>

          {/* activity */}
          <fieldset>
            <legend className="field-label">
              How lively? {touched && !activityLevel && <span className="text-coral">· pick one</span>}
            </legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Activity level">
              {ACTIVITY_LEVELS.map((lvl) => {
                const on = activityLevel === lvl;
                const meta = ACTIVITY_META[lvl];
                return (
                  <motion.button
                    key={lvl}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActivityLevel(lvl)}
                    className="activity-option"
                    style={on ? { borderColor: meta.color, background: meta.soft } : undefined}
                  >
                    <motion.span
                      className="text-2xl"
                      animate={on ? { scale: [1, 1.35, 1], rotate: [0, -12, 8, 0] } : { scale: 1 }}
                      transition={{ duration: 0.45 }}
                    >
                      {meta.emoji}
                    </motion.span>
                    <span className="text-xs font-black" style={{ color: on ? meta.color : "#5d6b85" }}>
                      {meta.short}
                    </span>
                    <span className="text-[10px] leading-tight font-semibold text-ink-mute">{meta.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </fieldset>

          {/* location */}
          <fieldset>
            <legend className="field-label">Location</legend>
            <div className="flex gap-2">
              <div className="segmented flex-1" role="radiogroup" aria-label="Location precision">
                <button type="button" role="radio" aria-checked={approximate} data-on={approximate || undefined} onClick={() => onApproximateChange(true)}>
                  🫧 Rough area
                </button>
                <button type="button" role="radio" aria-checked={!approximate} data-on={!approximate || undefined} onClick={() => onApproximateChange(false)}>
                  📍 Exact pin
                </button>
              </div>
              <button type="button" className="chip shrink-0" onClick={onUseMyLocation} disabled={geo.status === "locating"}>
                {geo.status === "locating" ? "…" : "🧭 Me"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-ink-mute">
              {approximate ? "Only a ~300 m area is shared — your secret spot stays secret 🤫" : "Everyone will see the exact pin."}
              {geo.status === "error" && <span className="text-[#c98500]"> {geo.message}</span>}
            </p>
          </fieldset>

          {/* note + quick messages */}
          <div>
            <span className="field-label">Say something</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_MESSAGES.map((m) => (
                <motion.button
                  key={m}
                  type="button"
                  className="chip shrink-0"
                  data-on={note === m || undefined}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setNote(m);
                    setShowNote(true);
                  }}
                >
                  {m}
                </motion.button>
              ))}
            </div>
            {showNote ? (
              <label className="block">
                <span className="sr-only">Note</span>
                <textarea
                  className="input min-h-[60px] resize-none"
                  value={note}
                  maxLength={LIMITS.noteMax}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Lure, depth, anything useful…"
                />
                <span className="mt-0.5 block text-right text-[10px] font-bold text-ink-mute">
                  {note.length}/{LIMITS.noteMax}
                </span>
              </label>
            ) : (
              <button type="button" className="self-start text-xs font-extrabold text-sky" onClick={() => setShowNote(true)}>
                + Write your own (optional)
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: [0, -6, 6, -3, 0] }}
              exit={{ opacity: 0 }}
              className="mt-2 shrink-0 rounded-2xl bg-coral-soft px-3 py-2 text-xs font-bold text-[#d6455d]"
              role="alert"
            >
              😵 {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          className="btn-primary mt-3 w-full shrink-0"
          whileTap={blocked ? undefined : { scale: 0.95 }}
          disabled={blocked}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span className="fp-loader fp-loader--sm fp-loader--light" /> Sharing…
            </>
          ) : cooldownRemaining > 0 ? (
            `Take a breather · ${cooldownRemaining}s`
          ) : touched && missing ? (
            missing
          ) : (
            "Share this spot 🎣"
          )}
        </motion.button>
      </form>
    </BottomSheet>
  );
}
