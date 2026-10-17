import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { formatAgo } from "../../domain/time";
import type { CommunityPost } from "../../types/fishing";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { Avatar } from "../ui/Avatar";

/**
 * One shared catch, floating in the ocean: the fish "carries" the card up from
 * the depths, then the card drifts gently on the water.
 */
export function PostBubble({
  post,
  index,
  fresh,
  now,
  onOpenProfile,
  onOpenCard,
  onLike,
}: {
  post: CommunityPost;
  index: number;
  fresh: boolean;
  now: number;
  onOpenProfile: (userId: string) => void;
  onOpenCard: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
}) {
  const [pop, setPop] = useState(0);
  const name = post.author?.displayName ?? "Angler";
  return (
    <motion.div
      layout
      initial={{ y: 180, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: fresh ? 0 : Math.min(index, 6) * 0.09 }}
      className="relative"
    >
      {/* bubble trail for brand-new posts */}
      <AnimatePresence>
        {fresh &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 z-0 rounded-full border-2 border-white/80 bg-white/30"
              style={{ width: 8 + (i % 3) * 5, height: 8 + (i % 3) * 5, bottom: -10 }}
              initial={{ y: 0, x: (i - 2) * 14, opacity: 0.9 }}
              animate={{ y: -140 - i * 20, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, delay: i * 0.12, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      <div className="fp-drift" style={{ animationDelay: `${(index % 5) * -1.1}s`, animationDuration: `${5 + (index % 3)}s` }}>
        {/* the fish carrying the card */}
        <motion.span
          className="absolute -top-5 -left-1 z-20 grid h-14 w-14 place-items-center rounded-full bg-white shadow-lg"
          initial={{ rotate: -25 }}
          animate={{ rotate: [-8, 6, -8] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <SpeciesIcon species={post.card.iconSpecies ?? ""} size={44} />
        </motion.span>

        <article className="relative z-10 ml-2 overflow-hidden rounded-[26px] bg-white/95 shadow-[0_14px_30px_-12px_rgba(10,40,90,0.55)]">
          <header className="flex items-center gap-2 py-2.5 pr-3 pl-14">
            <button
              className="flex min-w-0 items-center gap-2"
              onClick={() => onOpenProfile(post.userId)}
              aria-label={`Open ${name}'s profile`}
            >
              <Avatar profile={post.author} name={name} size={30} />
              <span className="truncate text-sm font-extrabold text-ink">{name}</span>
            </button>
            <span className="ml-auto shrink-0 text-[11px] font-bold text-ink-mute">{formatAgo(post.createdAt, now)}</span>
          </header>

          <button className="block w-full" onClick={() => onOpenCard(post)} aria-label={`Open ${post.card.speciesCommon} card`}>
            {post.card.photoUrl ? (
              <img src={post.card.photoUrl} alt={`${name}'s ${post.card.speciesCommon}`} className="aspect-[16/10] w-full object-cover" loading="lazy" />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center bg-gradient-to-b from-sky-soft to-[#cfeaff]">
                <SpeciesIcon species={post.card.iconSpecies ?? ""} size={150} />
              </div>
            )}
          </button>

          <div className="px-3.5 pt-2.5 pb-3">
            {post.caption && <p className="text-[15px] leading-snug font-bold text-ink">{post.caption}</p>}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="flex min-w-0 items-center gap-1 rounded-full bg-sky-soft px-2 py-1 text-[11px] font-extrabold text-sky">
                <SpeciesIcon species={post.card.iconSpecies ?? ""} size={20} />
                <span className="truncate">{post.card.speciesCommon}</span>
              </span>
              {post.card.placeName && <span className="truncate text-[11px] font-bold text-ink-mute">📍 {post.card.placeName}</span>}
              <button
                className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-extrabold transition"
                style={post.likedByMe ? { background: "#ffe8ec", color: "#ff6b81" } : { background: "#f2f5fa", color: "#5d6b85" }}
                onClick={() => {
                  setPop((p) => p + 1);
                  onLike(post);
                }}
                aria-pressed={post.likedByMe}
                aria-label={post.likedByMe ? "Unlike" : "Nice catch!"}
              >
                <span key={pop} className={pop ? "fp-like-pop inline-block" : "inline-block"}>
                  {post.likedByMe ? "💖" : "👍"}
                </span>
                {post.likeCount}
              </button>
            </div>
          </div>
        </article>
      </div>
    </motion.div>
  );
}
