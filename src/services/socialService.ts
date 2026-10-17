import type { ChatMessage, Conversation, FriendRequest, FriendState } from "../types/fishing";

/** Friends + 1:1 chat. Members only; only friends can message each other (enforced in the DB). */
export interface SocialService {
  getFriendState(otherId: string): Promise<FriendState>;
  sendFriendRequest(otherId: string): Promise<FriendState>;
  respondToRequest(friendshipId: string, accept: boolean): Promise<void>;
  removeFriendship(friendshipId: string): Promise<void>;
  getIncomingRequests(): Promise<FriendRequest[]>;
  getConversations(): Promise<Conversation[]>;
  getMessages(friendId: string): Promise<ChatMessage[]>;
  sendMessage(friendId: string, body: string): Promise<ChatMessage>;
  /** Live updates for the signed-in user. Returns unsubscribe. */
  subscribeSocial(handlers: { onMessage: (m: ChatMessage) => void; onFriendshipChange: () => void }): () => void;
}

export const QUICK_REPLIES = ["🎣 Heading over!", "🐟 Nice one!", "Where exactly?", "👍"] as const;

export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export const rowToMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  senderId: r.sender_id,
  recipientId: r.recipient_id,
  body: r.body,
  createdAt: new Date(r.created_at).toISOString(),
});
