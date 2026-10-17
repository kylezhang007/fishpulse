import { motion } from "motion/react";
import { useState } from "react";
import { formatAgo } from "../../domain/time";
import type { Conversation, FriendRequest, Profile } from "../../types/fishing";
import { FishIcon } from "../animations/FishIcon";
import { Avatar } from "../ui/Avatar";

/** Chat tab: friend requests on top, then conversations. */
export function ChatScreen({
  me,
  requests,
  conversations,
  unreadFor,
  now,
  onRespond,
  onOpenChat,
  onOpenProfile,
  onGoCommunity,
}: {
  me: Profile;
  requests: FriendRequest[];
  conversations: Conversation[];
  unreadFor: (c: Conversation) => number;
  now: number;
  onRespond: (r: FriendRequest, accept: boolean) => Promise<void>;
  onOpenChat: (friend: Profile) => void;
  onOpenProfile: (id: string) => void;
  onGoCommunity: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <motion.section
      className="absolute inset-0 z-20 overflow-y-auto bg-cream px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+120px)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      aria-label="Chats"
    >
      <div className="mx-auto max-w-lg">
        <h2 className="font-display text-[28px] leading-none font-extrabold text-ink">Chats 💬</h2>
        <p className="mt-1 text-xs font-bold text-ink-mute">Message your fishing friends</p>

        {requests.length > 0 && (
          <>
            <h3 className="mt-5 mb-2 text-xs font-extrabold text-ink-soft">Friend requests · {requests.length}</h3>
            <div className="space-y-2">
              {requests.map((r) => (
                <motion.div key={r.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="glass flex items-center gap-3 rounded-3xl p-3">
                  <button onClick={() => onOpenProfile(r.from.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <Avatar profile={r.from} size={42} />
                    <span className="min-w-0">
                      <span className="block truncate font-extrabold text-ink">{r.from.displayName}</span>
                      <span className="block text-[11px] font-bold text-ink-mute">wants to be fishing buddies · {formatAgo(r.createdAt, now)}</span>
                    </span>
                  </button>
                  <button
                    className="btn-primary h-9 shrink-0 px-3 text-xs"
                    disabled={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      await onRespond(r, true).finally(() => setBusy(null));
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className="icon-btn icon-btn--sm shrink-0"
                    aria-label={`Decline ${r.from.displayName}`}
                    disabled={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      await onRespond(r, false).finally(() => setBusy(null));
                    }}
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}

        <h3 className="mt-5 mb-2 text-xs font-extrabold text-ink-soft">Friends</h3>
        {conversations.length === 0 ? (
          <div className="glass rounded-3xl px-4 py-7 text-center">
            <FishIcon size={64} color="#3fb2ff" className="fp-bob mx-auto" />
            <p className="mt-2 font-extrabold text-ink">No fishing buddies yet</p>
            <p className="text-xs font-semibold text-ink-mute">Tap someone's avatar on the map or in the Ocean, then “Add friend”.</p>
            <button className="btn-sky mx-auto mt-4" onClick={onGoCommunity}>
              🌊 Find anglers in the Ocean
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => {
              const unread = unreadFor(c) > 0;
              const preview = c.last ? `${c.last.senderId === me.id ? "You: " : ""}${c.last.body}` : "Say hi 👋";
              return (
                <motion.button
                  key={c.friendshipId}
                  layout
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onOpenChat(c.friend)}
                  className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left"
                >
                  <span className="relative">
                    <Avatar profile={c.friend} size={46} />
                    {unread && <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-coral" aria-label="Unread" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-extrabold text-ink">{c.friend.displayName}</span>
                      {c.last && <span className="shrink-0 text-[11px] font-bold text-ink-mute">{formatAgo(c.last.createdAt, now)}</span>}
                    </span>
                    <span className={`block truncate text-sm ${unread ? "font-extrabold text-ink" : "font-semibold text-ink-mute"}`}>{preview}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
