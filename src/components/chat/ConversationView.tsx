import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatAgo } from "../../domain/time";
import { QUICK_REPLIES, type SocialService } from "../../services/socialService";
import type { ChatMessage, Profile } from "../../types/fishing";
import { Avatar } from "../ui/Avatar";

/** 1:1 chat with a friend: bubbles rise like air bubbles, live updates, quick replies. */
export function ConversationView({
  service,
  me,
  friend,
  liveMessage,
  now,
  onBack,
  onOpenProfile,
}: {
  service: SocialService;
  me: Profile;
  friend: Profile;
  liveMessage: ChatMessage | null;
  now: number;
  onBack: () => void;
  onOpenProfile: (id: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    service
      .getMessages(friend.id)
      .then(setMessages)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load messages."));
  }, [service, friend.id]);

  // Live messages for this conversation (ours echo back too — dedupe by id).
  useEffect(() => {
    if (!liveMessage) return;
    const m = liveMessage;
    if (!((m.senderId === friend.id && m.recipientId === me.id) || (m.senderId === me.id && m.recipientId === friend.id))) return;
    setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
  }, [liveMessage, friend.id, me.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  const send = async (body: string) => {
    const clean = body.trim();
    if (!clean || sending) return;
    setSending(true);
    setError(null);
    try {
      const m = await service.sendMessage(friend.id, clean);
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.section
      className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-[#e9f6ff] to-cream"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      aria-label={`Chat with ${friend.displayName}`}
    >
      <header className="glass mx-3 mt-[calc(env(safe-area-inset-top)+10px)] flex items-center gap-2 rounded-[22px] px-2 py-2">
        <button className="icon-btn icon-btn--sm" onClick={onBack} aria-label="Back to chats">
          ←
        </button>
        <button className="flex min-w-0 items-center gap-2" onClick={() => onOpenProfile(friend.id)}>
          <Avatar profile={friend} size={36} />
          <span className="truncate font-display text-lg font-extrabold text-ink">{friend.displayName}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {messages === null && !error && <p className="pt-10 text-center text-sm font-bold text-ink-mute">Loading…</p>}
        {messages && messages.length === 0 && (
          <p className="pt-10 text-center text-sm font-bold text-ink-mute">
            Say hi to {friend.displayName}! 👋
            <br />
            Share a spot, plan a trip, brag a little.
          </p>
        )}
        <div className="mx-auto max-w-lg space-y-2">
          <AnimatePresence initial={false}>
            {messages?.map((m) => {
              const mine = m.senderId === me.id;
              return (
                <motion.div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 24, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  <div
                    className={`max-w-[78%] rounded-[22px] px-3.5 py-2 text-[15px] font-semibold ${mine ? "rounded-br-md text-white" : "rounded-bl-md bg-white text-ink shadow-sm"}`}
                    style={mine ? { background: "linear-gradient(135deg, #ff8a5c, #ff6b81)" } : undefined}
                  >
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-0.5 text-right text-[10px] font-bold ${mine ? "text-white/75" : "text-ink-mute"}`}>{formatAgo(m.createdAt, now)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      {error && <p className="mx-4 mb-1 rounded-2xl bg-coral-soft px-3 py-2 text-xs font-bold text-[#d6455d]">😵 {error}</p>}
      <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="mx-auto mb-2 flex max-w-lg gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {QUICK_REPLIES.map((q) => (
            <button key={q} className="chip shrink-0 !min-h-8 text-xs" onClick={() => void send(q)} disabled={sending}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="glass mx-auto flex max-w-lg items-center gap-2 rounded-full p-1.5 pl-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <input
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${friend.displayName}…`}
            enterKeyHint="send"
          />
          <motion.button className="btn-primary h-10 w-10 shrink-0 !px-0" whileTap={{ scale: 0.88 }} disabled={!text.trim() || sending} aria-label="Send">
            ➤
          </motion.button>
        </form>
      </div>
    </motion.section>
  );
}
