import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "../../domain/image";
import { currentPosition, lookupPlaceName } from "../../domain/place";
import { FishIdError, type FishIdService } from "../../services/fishIdService";
import type { CatchCard, FishIdQuota } from "../../types/fishing";
import { BottomSheet } from "../ui/BottomSheet";

type Phase = { name: "pick" } | { name: "scanning"; preview: string } | { name: "nofish"; preview: string } | { name: "error"; message: string };

/** Camera → compress → (place name) → Fish ID → catch card. */
export function FishIdSheet({
  service,
  onCard,
  onClose,
  onHeightChange,
}: {
  service: FishIdService;
  onCard: (card: CatchCard) => void;
  onClose: () => void;
  onHeightChange: (h: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "pick" });
  const [quota, setQuota] = useState<FishIdQuota | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    service.getFishIdQuota().then(setQuota).catch(() => setQuota(null));
  }, [service]);

  const outOfIds = quota && !quota.unlimited && quota.remaining <= 0;

  const run = async (file: File | undefined) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhase({ name: "scanning", preview });
    try {
      // Place name in parallel with compression; never block for long.
      const placeP = Promise.race([
        currentPosition().then((p) => (p ? lookupPlaceName(p) : undefined)),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 7000)),
      ]);
      const [image, place] = await Promise.all([compressImage(file), placeP]);
      const result = await service.identifyFish(image, place);
      if (!result.found) {
        setPhase({ name: "nofish", preview });
        service.getFishIdQuota().then(setQuota).catch(() => {});
        return;
      }
      onCard(result.card);
    } catch (e) {
      setPhase({ name: "error", message: e instanceof FishIdError ? e.message : "Something went wrong identifying that fish." });
      service.getFishIdQuota().then(setQuota).catch(() => {});
    }
  };

  const quotaText = !quota ? "" : quota.demo ? "Demo mode · simulated, no credits used" : quota.unlimited ? "👑 Unlimited Fish IDs" : `${quota.remaining} of ${quota.perUserLimit} Fish IDs left this month`;

  return (
    <BottomSheet label="Fish ID" onHeightChange={onHeightChange}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] leading-tight font-extrabold text-ink">📷 Fish ID</h2>
          <p className="text-xs font-semibold text-ink-soft">{quotaText || "Snap your catch — we'll name it and make you a card."}</p>
        </div>
        <button onClick={onClose} className="icon-btn icon-btn--sm" aria-label="Close Fish ID">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void run(e.target.files?.[0])} />
      <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={(e) => void run(e.target.files?.[0])} />

      {(phase.name === "scanning" || phase.name === "nofish") && (
        <div className="relative mt-3 overflow-hidden rounded-3xl">
          <img src={phase.preview} alt="Your photo" className="h-56 w-full object-cover" />
          {phase.name === "scanning" && (
            <>
              <motion.span
                className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-sky/45 to-transparent"
                initial={{ top: "-20%" }}
                animate={{ top: ["-20%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              />
              <span className="absolute inset-x-0 bottom-0 bg-ink/45 py-2 text-center text-sm font-extrabold text-white">Identifying… 🐟</span>
            </>
          )}
        </div>
      )}

      {phase.name === "nofish" && (
        <p className="mt-3 rounded-2xl bg-sun-soft px-3 py-2 text-sm font-bold text-[#a06a00]">
          🤔 No fish spotted in that photo. Try a closer, clearer shot of the whole fish.
        </p>
      )}
      {phase.name === "error" && <p className="mt-3 rounded-2xl bg-coral-soft px-3 py-2 text-sm font-bold text-[#d6455d]">😵 {phase.message}</p>}

      {phase.name !== "scanning" && (
        <div className="mt-4 grid gap-2">
          <motion.button className="btn-primary w-full" whileTap={{ scale: 0.96 }} disabled={!!outOfIds} onClick={() => cameraInput.current?.click()}>
            📸 {phase.name === "pick" ? "Take a photo" : "Try another photo"}
          </motion.button>
          <button className="btn-secondary mx-auto" disabled={!!outOfIds} onClick={() => libraryInput.current?.click()}>
            Choose from library
          </button>
          <p className="mt-1 text-center text-[11px] font-semibold text-ink-mute">
            {outOfIds ? "You've used this month's Fish IDs." : "We ask for your location once to label the card with a place name (never exact coordinates)."}
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
