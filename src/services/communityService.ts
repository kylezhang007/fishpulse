import type { CommunityPost } from "../types/fishing";

/** Community feed: members share their own catch cards; everyone can read. */
export interface CommunityService {
  getFeed(limit?: number): Promise<CommunityPost[]>;
  /** Share one of your own catch cards (once per card). */
  sharePost(catchId: string, caption?: string): Promise<CommunityPost>;
  setLike(postId: string, liked: boolean): Promise<void>;
  /** New posts from anyone, live. Returns unsubscribe. */
  subscribePosts(onPost: (post: CommunityPost) => void): () => void;
  /** Which of my cards are already shared (to disable re-sharing). */
  getSharedCatchIds(userId: string): Promise<Set<string>>;
}

export const QUICK_CAPTIONS = ["Look what I caught! 🎣", "Personal best! 🏆", "Back in the water it goes 💦"] as const;
