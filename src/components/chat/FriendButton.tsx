import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SocialService } from "../../services/socialService";
import type { FriendState, Profile } from "../../types/fishing";

/** Add friend → Request sent → (they accept) → Message. Shown on other members' profiles. */
export function FriendButton({
  service,
  profile,
  version,
  onMessage,
  onChanged,
}: {
  service: SocialService;
  profile: Profile;
  /** Bumps when any friendship changes (re-check state). */
  version: number;
  onMessage: (p: Profile) => void;
  onChanged: () => void;
}) {
  const [state, setState] = useState<FriendState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    service.getFriendState(profile.id).then(setState).catch(() => setState({ status: "none" }));
  }, [service, profile.id, version]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setState(await service.getFriendState(profile.id));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (!state) return <div className="h-12" />;
  return (
    <div className="mt-3">
      {state.status === "none" && (
        <motion.button className="btn-primary w-full" whileTap={{ scale: 0.95 }} disabled={busy} onClick={() => void act(() => service.sendFriendRequest(profile.id))}>
          ➕ Add friend
        </motion.button>
      )}
      {state.status === "outgoing" && (
        <div className="flex items-center gap-2">
          <span className="flex h-12 flex-1 items-center justify-center rounded-full bg-sky-soft text-[15px] font-extrabold text-sky">⏳ Request sent</span>
          <button className="btn-secondary" disabled={busy} onClick={() => void act(() => service.removeFriendship(state.friendshipId))}>
            Cancel
          </button>
        </div>
      )}
      {state.status === "incoming" && (
        <div className="flex gap-2">
          <motion.button className="btn-primary flex-1" whileTap={{ scale: 0.95 }} disabled={busy} onClick={() => void act(() => service.respondToRequest(state.friendshipId, true))}>
            ✅ Accept friend request
          </motion.button>
          <button className="btn-secondary" disabled={busy} onClick={() => void act(() => service.respondToRequest(state.friendshipId, false))}>
            Decline
          </button>
        </div>
      )}
      {state.status === "friends" && (
        <div className="flex items-center gap-2">
          <motion.button className="btn-sky flex-1" whileTap={{ scale: 0.95 }} onClick={() => onMessage(profile)}>
            💬 Message
          </motion.button>
          <span className="rounded-full bg-mint-soft px-3 py-2 text-xs font-extrabold text-[#139a6c]">🤝 Friends</span>
        </div>
      )}
      {error && <p className="mt-2 rounded-2xl bg-coral-soft px-3 py-2 text-xs font-bold text-[#d6455d]">😵 {error}</p>}
    </div>
  );
}
