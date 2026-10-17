import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialService } from "../services/socialService";
import type { ChatMessage, Conversation, FriendRequest } from "../types/fishing";

const READ_KEY = "fishpulse.chat.lastRead.v1";

function loadRead(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Friends + chat state for the signed-in member: incoming requests, conversations,
 * per-friend unread counts (last-read time is kept on this device) and live updates.
 */
export function useSocial(service: SocialService, enabled: boolean, myId: string | undefined, onIncoming?: (m: ChatMessage) => void) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lastRead, setLastRead] = useState<Record<string, number>>(loadRead);
  const [version, setVersion] = useState(0); // bumps on any friendship change (profile buttons re-check)
  const [liveMessage, setLiveMessage] = useState<ChatMessage | null>(null);
  const openFriend = useRef<string | null>(null);
  const cb = useRef(onIncoming);
  cb.current = onIncoming;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const [r, c] = await Promise.all([service.getIncomingRequests(), service.getConversations()]);
      setRequests(r);
      setConversations(c);
    } catch (e) {
      console.warn("[FishPulse] social refresh failed", e);
    }
  }, [service, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh, myId]);

  const markRead = useCallback((friendId: string) => {
    setLastRead((prev) => {
      const next = { ...prev, [friendId]: Date.now() };
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return service.subscribeSocial({
      onMessage: (m) => {
        const friendId = m.senderId === myId ? m.recipientId : m.senderId;
        setConversations((prev) => {
          const found = prev.find((c) => c.friend.id === friendId);
          if (!found) {
            void refresh();
            return prev;
          }
          return [{ ...found, last: m }, ...prev.filter((c) => c.friend.id !== friendId)];
        });
        setLiveMessage(m);
        if (m.senderId !== myId) {
          if (openFriend.current === friendId) markRead(friendId);
          else cb.current?.(m);
        }
      },
      onFriendshipChange: () => {
        setVersion((v) => v + 1);
        void refresh();
      },
    });
  }, [service, enabled, myId, refresh, markRead]);

  const unreadFor = useCallback(
    (c: Conversation) => (c.last && c.last.senderId !== myId && Date.parse(c.last.createdAt) > (lastRead[c.friend.id] ?? 0) ? 1 : 0),
    [lastRead, myId],
  );
  const unreadTotal = conversations.reduce((n, c) => n + unreadFor(c), 0);

  return {
    requests,
    conversations,
    unreadFor,
    badge: requests.length + unreadTotal,
    version,
    liveMessage,
    refresh,
    markRead,
    setOpenFriend: (id: string | null) => {
      openFriend.current = id;
      if (id) markRead(id);
    },
  };
}
