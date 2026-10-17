import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { daysSince } from "../../domain/profile";
import type { ProfileService } from "../../services";
import type { FishIdService } from "../../services/fishIdService";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { DEMO_FISHING_CAREER, type CatchCard, type Profile } from "../../types/fishing";
import { Avatar } from "../ui/Avatar";
import { JoinForm } from "./JoinForm";

/**
 * Profile page — your own ("Me" tab) or someone else's (opened from the map).
 * Catch cards and the fish-count badges arrive with Fish ID (Phase B).
 */
export function ProfileScreen({
  profile,
  isMe,
  service,
  cardsVersion = 0,
  onOpenCard,
  onBack,
  onJoin,
  onAdminClear,
}: {
  profile: Profile;
  isMe: boolean;
  service: ProfileService & FishIdService;
  /** Bump to reload catch cards (e.g. after a new Fish ID). */
  cardsVersion?: number;
  onOpenCard?: (card: CatchCard) => void;
  onBack?: () => void;
  onJoin?: (code: string, name: string) => Promise<unknown>;
  /** Admin only: wipe all hotspots (everyone's map refreshes). */
  onAdminClear?: () => Promise<number>;
}) {
  const [reports, setReports] = useState<number | null>(null);
  useEffect(() => {
    service
      .getProfileStats(profile.id)
      .then((s) => setReports(s.reportsCount))
      .catch(() => setReports(null));
  }, [service, profile.id]);

  const [cards, setCards] = useState<CatchCard[] | null>(null);
  useEffect(() => {
    service
      .getCatches(profile.id)
      .then(setCards)
      .catch(() => setCards([]));
  }, [service, profile.id, cardsVersion]);

  const member = profile.role === "member" || profile.role === "admin";
  const admin = profile.role === "admin";
  const [clearStep, setClearStep] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [clearMsg, setClearMsg] = useState<string | null>(null);
  useEffect(() => {
    if (clearStep !== "confirm") return;
    const t = setTimeout(() => setClearStep("idle"), 4000); // confirmation window
    return () => clearTimeout(t);
  }, [clearStep]);
  const runClear = async () => {
    if (!onAdminClear) return;
    if (clearStep !== "confirm") return setClearStep("confirm");
    setClearStep("busy");
    try {
      const n = await onAdminClear();
      setClearMsg(`Cleared ${n} ${n === 1 ? "spot" : "spots"}. Everyone's map refreshed.`);
      setClearStep("done");
    } catch (e) {
      setClearMsg(e instanceof Error ? e.message : "Couldn't clear.");
      setClearStep("idle");
    }
  };
  const days = daysSince(profile.createdAt);
  const joined = new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const stats = [
    { label: "Fishing career", value: DEMO_FISHING_CAREER },
    { label: "In community", value: `${days} ${days === 1 ? "day" : "days"}` },
    { label: "Spots shared", value: reports ?? "—" },
    { label: "Catch cards", value: cards?.length ?? "—" },
  ];
  const badges = [
    { icon: "🎟️", label: "Member", on: member },
    { icon: "📍", label: "First spot", on: (reports ?? 0) >= 1 },
    { icon: "🔥", label: "5 spots", on: (reports ?? 0) >= 5 },
    { icon: "🐟", label: "First catch", on: (cards?.length ?? 0) >= 1 },
  ];

  return (
    <motion.section
      className="absolute inset-0 z-20 overflow-y-auto bg-cream px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+110px)]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      aria-label={`${profile.displayName}'s profile`}
    >
      <div className="mx-auto max-w-lg">
        {onBack && (
          <button onClick={onBack} className="mb-2 text-sm font-extrabold text-sky">
            ← Back
          </button>
        )}

        <div className="glass flex items-center gap-4 rounded-[28px] p-4">
          <motion.span initial={{ scale: 0.5, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
            <Avatar profile={profile} size={72} ring />
          </motion.span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-[26px] leading-tight font-extrabold text-ink">{profile.displayName}</h2>
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black"
              style={admin ? { background: "#fff3d6", color: "#c98500" } : member ? { background: "#ffe8ec", color: "#ff6b81" } : { background: "#f2f5fa", color: "#5d6b85" }}
            >
              {admin ? "👑 Admin" : member ? "✓ Member" : "Guest"}
            </span>
            <p className="mt-1 text-xs font-semibold text-ink-mute">Joined {joined}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-3xl px-4 py-3">
              <p className="text-[11px] font-extrabold text-ink-mute">{s.label}</p>
              <p className="font-display text-[22px] leading-tight font-extrabold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-5 mb-2 text-xs font-extrabold text-ink-soft">Badges</h3>
        <div className="grid grid-cols-4 gap-2">
          {badges.map((b) => (
            <div key={b.label} className="glass flex flex-col items-center rounded-3xl px-1 py-3 text-center" style={{ opacity: b.on ? 1 : 0.45 }}>
              <span className="text-2xl" style={{ filter: b.on ? undefined : "grayscale(1)" }}>
                {b.icon}
              </span>
              <span className="mt-1 text-[10px] leading-tight font-extrabold text-ink-soft">{b.label}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-5 mb-2 text-xs font-extrabold text-ink-soft">Catch cards</h3>
        {cards && cards.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {cards.map((c, i) => (
              <motion.button
                key={c.id}
                className="glass overflow-hidden rounded-3xl text-left"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onOpenCard?.(c)}
              >
                <div className="relative aspect-[4/3] bg-sky-soft">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <SpeciesIcon species={c.iconSpecies ?? ""} size={70} />
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-white/90 px-1.5 text-[10px] font-black text-ink-soft">No.{String(c.cardNo).padStart(3, "0")}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-2">
                  <SpeciesIcon species={c.iconSpecies ?? ""} size={24} />
                  <span className="truncate text-xs font-extrabold text-ink">{c.speciesCommon}</span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl px-4 py-6 text-center">
            <p className="text-3xl">🃏</p>
            <p className="mt-1 text-sm font-extrabold text-ink">{cards === null ? "Loading cards…" : "No catch cards yet"}</p>
            {cards !== null && <p className="text-xs font-semibold text-ink-mute">{isMe ? "Tap the 📷 button to identify a catch and collect your first card." : "No cards collected yet."}</p>}
          </div>
        )}

        {isMe && admin && onAdminClear && (
          <div className="glass mt-5 rounded-[26px] p-4">
            <p className="font-display text-lg font-extrabold text-ink">👑 Admin tools</p>
            <p className="mb-3 text-xs font-semibold text-ink-soft">Unlimited Fish ID (when it launches). Clearing removes every hotspot for everyone.</p>
            <button
              className="flex h-12 w-full items-center justify-center rounded-full text-[15px] font-extrabold text-white transition active:scale-[0.97] disabled:opacity-60"
              style={{ background: clearStep === "confirm" ? "#d6455d" : "#ff6b81" }}
              onClick={() => void runClear()}
              disabled={clearStep === "busy"}
            >
              {clearStep === "confirm" ? "Tap again to clear ALL spots" : clearStep === "busy" ? "Clearing…" : "🧹 Clear all hotspots"}
            </button>
            {clearMsg && <p className="mt-2 text-center text-xs font-bold text-ink-soft">{clearMsg}</p>}
          </div>
        )}

        {isMe && !member && onJoin && (
          <div className="glass mt-5 rounded-[26px] p-4">
            <p className="mb-1 font-display text-lg font-extrabold text-ink">🎟️ Become a member</p>
            <p className="mb-3 text-xs font-semibold text-ink-soft">Members can share spots, use Fish ID and post to the community.</p>
            <JoinForm onJoin={onJoin} checkName={(n) => service.isNameAvailable(n)} submitLabel="Become a member" />
          </div>
        )}
      </div>
    </motion.section>
  );
}
