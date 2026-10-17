import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { QUICK_CAPTIONS, type CommunityService } from "../../services/communityService";
import type { FishIdService } from "../../services/fishIdService";
import type { CatchCard, CommunityPost } from "../../types/fishing";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { BottomSheet } from "../ui/BottomSheet";

/** Pick one of your catch cards + a short caption, and release it into the ocean. */
export function ShareCatchSheet({
  service,
  userId,
  preselectId,
  onShared,
  onClose,
  onHeightChange,
}: {
  service: CommunityService & FishIdService;
  userId: string;
  preselectId?: string;
  onShared: (post: CommunityPost) => void;
  onClose: () => void;
  onHeightChange: (h: number) => void;
}) {
  const [cards, setCards] = useState<CatchCard[] | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(preselectId ?? null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([service.getCatches(userId), service.getSharedCatchIds(userId)])
      .then(([c, s]) => {
        setCards(c);
        setShared(s);
        if (!preselectId) setSelected(c.find((x) => !s.has(x.id))?.id ?? null);
      })
      .catch(() => setCards([]));
  }, [service, userId, preselectId]);

  const share = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      onShared(await service.sharePost(selected, caption));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't share.");
      setBusy(false);
    }
  };

  return (
    <BottomSheet label="Share a catch" onHeightChange={onHeightChange}>
      <div className="flex max-h-[min(70dvh,600px)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] leading-tight font-extrabold text-ink">Share a catch 🌊</h2>
            <p className="text-xs font-semibold text-ink-soft">Release one of your catch cards into the ocean.</p>
          </div>
          <button onClick={onClose} className="icon-btn icon-btn--sm" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="-mx-4 mt-3 flex-1 overflow-y-auto px-4">
          {cards === null && <p className="py-6 text-center text-sm font-bold text-ink-mute">Loading your cards…</p>}
          {cards && cards.length === 0 && (
            <p className="rounded-2xl bg-sky-soft px-3 py-4 text-center text-sm font-bold text-sky">
              No catch cards yet — tap 📷 Fish ID to collect your first one!
            </p>
          )}
          {cards && cards.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {cards.map((c) => {
                const isShared = shared.has(c.id);
                const on = selected === c.id;
                return (
                  <motion.button
                    key={c.id}
                    whileTap={isShared ? undefined : { scale: 0.92 }}
                    disabled={isShared}
                    onClick={() => setSelected(c.id)}
                    className="relative overflow-hidden rounded-2xl border-[3px] bg-white text-left disabled:opacity-50"
                    style={{ borderColor: on ? "#ff6b81" : "#edf1f7" }}
                    aria-pressed={on}
                  >
                    <div className="grid aspect-square place-items-center bg-sky-soft">
                      {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" /> : <SpeciesIcon species={c.iconSpecies ?? ""} size={56} />}
                    </div>
                    <p className="truncate px-1.5 py-1 text-[10px] font-extrabold text-ink">{isShared ? "Shared ✓" : c.speciesCommon}</p>
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-3">
            <span className="field-label">Say something</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_CAPTIONS.map((q) => (
                <button key={q} type="button" className="chip shrink-0" data-on={caption === q || undefined} onClick={() => setCaption(q)}>
                  {q}
                </button>
              ))}
            </div>
            <input className="input" value={caption} maxLength={140} onChange={(e) => setCaption(e.target.value)} placeholder="Tell the crew about it…" />
          </div>
        </div>

        {error && <p className="mt-2 shrink-0 rounded-2xl bg-coral-soft px-3 py-2 text-xs font-bold text-[#d6455d]">😵 {error}</p>}
        <motion.button className="btn-primary mt-3 w-full shrink-0" whileTap={{ scale: 0.96 }} disabled={!selected || busy} onClick={() => void share()} aria-busy={busy}>
          {busy ? "Releasing…" : "🌊 Share to the ocean"}
        </motion.button>
      </div>
    </BottomSheet>
  );
}
