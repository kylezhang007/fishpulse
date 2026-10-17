import { useCallback, useEffect, useRef, useState } from "react";
import type { CommunityService } from "../services/communityService";
import type { CommunityPost } from "../types/fishing";

/** Feed state for the Ocean: lazy-loads when first opened, live-updates, optimistic likes. */
export function useCommunity(service: CommunityService, active: boolean, onNewPost?: (p: CommunityPost) => void) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const loaded = useRef(false);
  const cb = useRef(onNewPost);
  cb.current = onNewPost;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await service.getFeed());
      loaded.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the ocean.");
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (active && !loaded.current) void load();
  }, [active, load]);

  const injectPost = useCallback((post: CommunityPost, fromOthers: boolean) => {
    let isNew = false;
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      isNew = true;
      return [post, ...prev];
    });
    setFreshIds((s) => new Set(s).add(post.id));
    setTimeout(
      () =>
        setFreshIds((s) => {
          const n = new Set(s);
          n.delete(post.id);
          return n;
        }),
      2500,
    );
    if (fromOthers && isNew) cb.current?.(post);
  }, []);

  useEffect(() => service.subscribePosts((post) => injectPost(post, true)), [service, injectPost]);

  const toggleLike = useCallback(
    async (post: CommunityPost) => {
      const liked = !post.likedByMe;
      const apply = (l: boolean) =>
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likedByMe: l, likeCount: Math.max(0, p.likeCount + (l ? 1 : -1)) } : p)));
      apply(liked);
      try {
        await service.setLike(post.id, liked);
      } catch (e) {
        apply(!liked); // roll back
        throw e;
      }
    },
    [service],
  );

  return { posts, loading, error, freshIds, reload: load, toggleLike, injectPost };
}
