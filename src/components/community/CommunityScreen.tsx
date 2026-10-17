import { motion } from "motion/react";
import type { CommunityPost } from "../../types/fishing";
import { FishIcon } from "../animations/FishIcon";
import { PostBubble } from "./PostBubble";

const BUBBLES = Array.from({ length: 9 }, (_, i) => ({ left: `${6 + i * 11}%`, size: 8 + (i % 4) * 6, delay: -i * 1.3, dur: 9 + (i % 3) * 3 }));
const SWIMMERS = [
  { top: "38%", delay: -4, color: "#ffffff", size: 46 },
  { top: "62%", delay: -15, color: "#bfe6ff", size: 34 },
  { top: "82%", delay: -9, color: "#ffffff", size: 58 },
];

function Wave({ className, fill }: { className: string; fill: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 46" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 22 C 100 4, 200 40, 300 22 S 500 4, 600 22 S 800 40, 900 22 S 1100 4, 1200 22 V46 H0 Z"
        fill={fill}
      />
    </svg>
  );
}

/** The community "Ocean": shared catch cards float up from the depths. */
export function CommunityScreen({
  posts,
  loading,
  error,
  freshIds,
  now,
  canShare,
  onShare,
  onOpenProfile,
  onOpenCard,
  onLike,
  onRetry,
}: {
  posts: CommunityPost[];
  loading: boolean;
  error: string | null;
  freshIds: Set<string>;
  now: number;
  canShare: boolean;
  onShare: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenCard: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onRetry: () => void;
}) {
  return (
    <motion.section
      className="fp-ocean absolute inset-0 z-20 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-label="Community ocean"
    >
      {/* ambient ocean life */}
      {BUBBLES.map((b, i) => (
        <span key={i} className="fp-rise" style={{ left: b.left, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
      ))}
      {SWIMMERS.map((s, i) => (
        <span key={i} className="fp-swim" style={{ top: s.top, animationDelay: `${s.delay}s` }}>
          <FishIcon size={s.size} color={s.color} />
        </span>
      ))}

      {/* sky + surface */}
      <div className="relative z-10 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2">
        <div className="mx-auto flex max-w-lg items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[26px] leading-none font-extrabold whitespace-nowrap text-[#145a9c]">The Ocean 🌊</h2>
            <p className="mt-1 text-xs font-bold text-[#2a74b8]">Catches shared by the FishPulse crew</p>
          </div>
          <motion.button
            className="btn-primary h-11 shrink-0 px-4 text-sm"
            whileTap={{ scale: 0.92 }}
            onClick={onShare}
            aria-label={canShare ? "Share a catch" : "Share a catch (members only)"}
          >
            {canShare ? "＋ Share" : "🔒 Share"}
          </motion.button>
        </div>
      </div>
      <div className="relative z-0 h-[46px] overflow-hidden" aria-hidden="true">
        <Wave className="fp-waves fp-waves--back top-0" fill="#8ad4ff" />
        <Wave className="fp-waves top-1" fill="#5cbfff" />
      </div>

      {/* the water: posts float here */}
      <div className="relative z-10 h-[calc(100%-150px)] overflow-y-auto overscroll-contain px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="mx-auto max-w-lg space-y-9">
          {loading && posts.length === 0 && (
            <p className="pt-10 text-center text-sm font-extrabold text-white/90" role="status">
              Diving for catches… 🫧
            </p>
          )}
          {error && (
            <div className="rounded-3xl bg-white/90 p-4 text-center">
              <p className="text-sm font-bold text-[#d6455d]">😵 {error}</p>
              <button className="btn-secondary mt-2" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
          {!loading && !error && posts.length === 0 && (
            <div className="pt-8 text-center text-white">
              <p className="text-5xl">🫧</p>
              <p className="mt-2 font-display text-xl font-extrabold">The ocean is quiet…</p>
              <p className="text-sm font-bold text-white/85">Be the first to share a catch card!</p>
            </div>
          )}
          {posts.map((p, i) => (
            <PostBubble
              key={p.id}
              post={p}
              index={i}
              fresh={freshIds.has(p.id)}
              now={now}
              onOpenProfile={onOpenProfile}
              onOpenCard={onOpenCard}
              onLike={onLike}
            />
          ))}
          {posts.length > 0 && <p className="pt-2 text-center text-xs font-bold text-white/70">🐚 You've reached the sea floor</p>}
        </div>
      </div>
    </motion.section>
  );
}
