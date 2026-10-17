import { motion } from "motion/react";
import type { CatchCard, Profile } from "../../types/fishing";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { Avatar } from "../ui/Avatar";

/** Collectible catch card — flips in like a freshly pulled trading card. */
export function CatchCardView({
  card,
  owner,
  justCreated = false,
  onShare,
  onClose,
}: {
  card: CatchCard;
  owner?: Profile | null;
  justCreated?: boolean;
  /** Shown for your own, not-yet-shared cards. */
  onShare?: () => void;
  onClose: () => void;
}) {
  const date = new Date(card.caughtAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const pct = card.certainty !== undefined ? Math.round(card.certainty * 100) : null;
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/45 px-5 py-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: "none" }}
      onClick={onClose}
      role="dialog"
      aria-label={`Catch card: ${card.speciesCommon}`}
    >
      <motion.div
        className="relative w-full max-w-[340px]"
        style={{ perspective: 1000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {justCreated && (
          <motion.p
            className="mb-3 text-center font-display text-[22px] font-extrabold text-white drop-shadow"
            initial={{ y: -10, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.55, type: "spring", stiffness: 400, damping: 14 }}
          >
            ✨ New catch card! ✨
          </motion.p>
        )}
        <motion.article
          className="overflow-hidden rounded-[28px] border-[6px] border-white bg-white shadow-2xl"
          style={{ transformStyle: "preserve-3d" }}
          initial={justCreated ? { rotateY: 180, scale: 0.6 } : { scale: 0.92, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 16 }}
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-sky to-[#7c6bff] px-4 py-2 text-white">
            <span className="font-display text-sm font-extrabold tracking-wide">FishPulse · No.{String(card.cardNo).padStart(3, "0")}</span>
            {pct !== null && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-black">AI {pct}%</span>}
          </div>
          <div className="relative aspect-[4/3] bg-sky-soft">
            {card.photoUrl ? (
              <img src={card.photoUrl} alt={`Photo of a ${card.speciesCommon}`} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center">
                <SpeciesIcon species={card.iconSpecies ?? ""} size={140} />
              </div>
            )}
            <span className="absolute right-2 bottom-2 grid h-14 w-14 place-items-center rounded-full bg-white shadow-lg">
              <SpeciesIcon species={card.iconSpecies ?? ""} size={42} />
            </span>
          </div>
          <div className="px-4 pt-3 pb-4">
            <h2 className="font-display text-[26px] leading-tight font-extrabold text-ink">{card.speciesCommon}</h2>
            {card.speciesScientific && <p className="text-sm font-semibold text-ink-soft italic">{card.speciesScientific}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              <span className="tag">📅 {date}</span>
              <span className="tag">📍 {card.placeName ?? "Unknown spot"}</span>
            </div>
            {card.wikiUrl && (
              <a
                href={card.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-between rounded-2xl bg-sky-soft px-3 py-2.5 text-sm font-extrabold text-sky"
              >
                📖 Learn about this fish <span aria-hidden="true">→</span>
              </a>
            )}
            {owner && (
              <div className="mt-3 flex items-center gap-2 border-t-2 border-dashed border-[#edf1f7] pt-3">
                <Avatar profile={owner} size={28} />
                <span className="text-sm font-extrabold text-ink">{owner.displayName}</span>
                <span className="ml-auto text-[11px] font-bold text-ink-mute">AI-identified · not verified</span>
              </div>
            )}
          </div>
        </motion.article>
        <div className="mt-4 flex flex-col items-center gap-2">
          {justCreated && <p className="text-xs font-bold text-white/90">Saved to your cards ✓</p>}
          <div className="flex gap-2">
            {onShare && (
              <button className="btn-primary px-5" onClick={onShare}>
                🌊 Share to Community
              </button>
            )}
            <button className="btn-sky px-6" onClick={onClose}>
              {justCreated && !onShare ? "Awesome!" : "Close"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
