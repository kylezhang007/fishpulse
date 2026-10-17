import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import type { CommunityService } from "./communityService";
import { rowToMessage, type MessageRow, type SocialService } from "./socialService";
import type { ChatMessage, Conversation, FriendRequest, FriendState, CommunityPost, CatchCard, ConnectionStatus, CreateFishingSpotInput, FishIdQuota, FishIdResult, FishingSpot, Profile } from "../types/fishing";
import { FishIdError, rowToCatch, type CatchRow, type FishIdErrorCode, type FishIdService } from "./fishIdService";
import { SpotServiceError, type FishingSpotService } from "./fishingSpotService";
import { PROFILE_COLUMNS, profileErrorFromMessage, rowToProfile, type ProfileRow, type ProfileService } from "./profileService";
import { inputToInsert, PUBLIC_COLUMNS, rowToSpot, type FishingSpotRow } from "./spotRecord";

const TABLE = "fishing_spots";
const MAX_SPOTS = 500;
const AUTH_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

function friendly(message: string): string {
  return /failed to fetch|networkerror|load failed/i.test(message)
    ? "Can't reach the FishPulse server. Check your connection."
    : message;
}

/**
 * LIVE MODE adapter — Supabase Postgres + Realtime + Anonymous Auth.
 *
 * Realtime uses `postgres_changes` INSERT events on `public.fishing_spots`.
 * RLS is enforced for realtime too, so clients only receive rows they may read.
 */
export class SupabaseFishingSpotService implements FishingSpotService, ProfileService, FishIdService, CommunityService, SocialService {
  readonly mode = "live" as const;
  readonly syncScope = "Live · synced across devices via Supabase Realtime";

  private readonly client: SupabaseClient;
  private initPromise: Promise<void> | null = null;
  private authError: SpotServiceError | null = null;

  private readonly photoBase: string;

  constructor(url: string, anonKey: string, private readonly ttlMinutes: number) {
    this.client = getSupabase(url, anonKey);
    this.photoBase = `${url.replace(/\/$/, "")}/storage/v1/object/public/catch-photos`;
  }

  // ── Fish ID (Edge Function "identify-fish" → Fishial.ai; key stays server-side) ──

  async identifyFish(image: Blob, placeName?: string): Promise<FishIdResult> {
    await this.init();
    const headers: Record<string, string> = { "Content-Type": image.type || "image/jpeg" };
    if (placeName) headers["x-place"] = encodeURIComponent(placeName);
    const { data, error } = await this.client.functions.invoke("identify-fish", { body: image, headers });
    if (error) {
      let code: FishIdErrorCode = "unknown";
      try {
        const body = await (error as { context?: Response }).context?.json();
        const known: FishIdErrorCode[] = ["members_only", "quota_user", "quota_global", "out_of_credits", "not_configured", "bad_image"];
        if (known.includes(body?.error)) code = body.error;
      } catch {
        code = /fetch|network/i.test(error.message) ? "network" : "unknown";
      }
      throw new FishIdError(code);
    }
    if (!data?.found) return { found: false };
    return { found: true, card: rowToCatch(data.card as CatchRow, this.photoBase) };
  }

  // ── Friends + chat ───────────────────────────────────────────────────────

  private async requireMe(): Promise<string> {
    const id = await this.myId();
    if (!id) throw new Error("Not signed in.");
    return id;
  }

  async getFriendState(otherId: string): Promise<FriendState> {
    const me = await this.requireMe();
    const { data } = await this.client
      .from("friendships")
      .select("id,requester_id,addressee_id,status")
      .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`)
      .maybeSingle();
    if (!data) return { status: "none" };
    if (data.status === "accepted") return { status: "friends", friendshipId: data.id };
    return { status: data.requester_id === me ? "outgoing" : "incoming", friendshipId: data.id };
  }

  async sendFriendRequest(otherId: string): Promise<FriendState> {
    await this.requireMe();
    const { data, error } = await this.client.from("friendships").insert({ addressee_id: otherId }).select("id").single();
    if (error) {
      if (error.code === "23505") return this.getFriendState(otherId);
      throw new Error(error.code === "42501" ? "Only members can add friends." : `Couldn't send request: ${error.message}`);
    }
    return { status: "outgoing", friendshipId: data.id };
  }

  async respondToRequest(friendshipId: string, accept: boolean): Promise<void> {
    if (accept) {
      const { error } = await this.client.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", friendshipId);
      if (error) throw new Error(`Couldn't accept: ${error.message}`);
    } else {
      await this.removeFriendship(friendshipId);
    }
  }

  async removeFriendship(friendshipId: string): Promise<void> {
    const { error } = await this.client.from("friendships").delete().eq("id", friendshipId);
    if (error) throw new Error(error.message);
  }

  async getIncomingRequests(): Promise<FriendRequest[]> {
    const me = await this.requireMe();
    const { data, error } = await this.client
      .from("friendships")
      .select("id,created_at,from:profiles!friendships_requester_id_fkey(id,display_name,role,avatar_color,created_at)")
      .eq("addressee_id", me)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as { id: string; created_at: string; from: ProfileRow }[])
      .filter((r) => r.from)
      .map((r) => ({ id: r.id, createdAt: r.created_at, from: rowToProfile(r.from) }));
  }

  async getConversations(): Promise<Conversation[]> {
    const me = await this.requireMe();
    const { data, error } = await this.client
      .from("friendships")
      .select(
        "id,requester:profiles!friendships_requester_id_fkey(id,display_name,role,avatar_color,created_at),addressee:profiles!friendships_addressee_id_fkey(id,display_name,role,avatar_color,created_at)",
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`);
    if (error) throw new Error(error.message);
    const { data: msgs } = await this.client
      .from("messages")
      .select("id,sender_id,recipient_id,body,created_at")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(300);
    const lastBy = new Map<string, ChatMessage>();
    for (const m of (msgs ?? []) as MessageRow[]) {
      const other = m.sender_id === me ? m.recipient_id : m.sender_id;
      if (!lastBy.has(other)) lastBy.set(other, rowToMessage(m));
    }
    return ((data ?? []) as unknown as { id: string; requester: ProfileRow; addressee: ProfileRow }[])
      .map((r) => {
        const friend = rowToProfile(r.requester.id === me ? r.addressee : r.requester);
        return { friendshipId: r.id, friend, last: lastBy.get(friend.id) };
      })
      .sort((a, b) => Date.parse(b.last?.createdAt ?? "0") - Date.parse(a.last?.createdAt ?? "0"));
  }

  async getMessages(friendId: string): Promise<ChatMessage[]> {
    const me = await this.requireMe();
    const { data, error } = await this.client
      .from("messages")
      .select("id,sender_id,recipient_id,body,created_at")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${me})`)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return ((data ?? []) as MessageRow[]).map(rowToMessage);
  }

  async sendMessage(friendId: string, body: string): Promise<ChatMessage> {
    await this.requireMe();
    const { data, error } = await this.client
      .from("messages")
      .insert({ recipient_id: friendId, body: body.trim().slice(0, 500) })
      .select("id,sender_id,recipient_id,body,created_at")
      .single();
    if (error) throw new Error(error.code === "42501" ? "You can only message friends." : `Couldn't send: ${error.message}`);
    return rowToMessage(data as MessageRow);
  }

  subscribeSocial(handlers: { onMessage: (m: ChatMessage) => void; onFriendshipChange: () => void }): () => void {
    let ch: RealtimeChannel | null = null;
    let disposed = false;
    void this.init().then(() => {
      if (disposed) return;
      ch = this.client
        .channel(`social-${Math.random().toString(36).slice(2, 8)}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => handlers.onMessage(rowToMessage(p.new as MessageRow)))
        .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => handlers.onFriendshipChange())
        .subscribe();
    });
    return () => {
      disposed = true;
      if (ch) void this.client.removeChannel(ch);
    };
  }

  // ── Community ────────────────────────────────────────────────────────────

  private static POST_SELECT =
    "id,user_id,caption,created_at,catches(id,user_id,card_no,species_common,species_scientific,icon_species,certainty,photo_path,place_name,wiki_url,caught_at),profiles!posts_user_id_fkey(id,display_name,role,avatar_color,created_at),post_likes(count)";

  private async rowsToPosts(rows: Record<string, unknown>[]): Promise<CommunityPost[]> {
    const { data: s } = await this.client.auth.getSession();
    const me = s.session?.user.id;
    let mine = new Set<string>();
    if (me && rows.length) {
      const { data } = await this.client.from("post_likes").select("post_id").eq("user_id", me).in("post_id", rows.map((r) => r.id as string));
      mine = new Set((data ?? []).map((d) => d.post_id as string));
    }
    return rows
      .filter((r) => r.catches)
      .map((r) => {
        const likes = r.post_likes as { count: number }[] | undefined;
        return {
          id: r.id as string,
          userId: r.user_id as string,
          caption: (r.caption as string | null) ?? undefined,
          createdAt: new Date(r.created_at as string).toISOString(),
          card: rowToCatch(r.catches as CatchRow, this.photoBase),
          author: r.profiles ? rowToProfile(r.profiles as ProfileRow) : undefined,
          likeCount: Number(likes?.[0]?.count ?? 0),
          likedByMe: mine.has(r.id as string),
        };
      });
  }

  async getFeed(limit = 40): Promise<CommunityPost[]> {
    await this.init();
    const { data, error } = await this.client.from("posts").select(SupabaseFishingSpotService.POST_SELECT).order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(`Couldn't load the ocean: ${error.message}`);
    return this.rowsToPosts((data ?? []) as unknown as Record<string, unknown>[]);
  }

  async sharePost(catchId: string, caption?: string): Promise<CommunityPost> {
    await this.init();
    const { data, error } = await this.client
      .from("posts")
      .insert({ catch_id: catchId, caption: caption?.trim() || null })
      .select(SupabaseFishingSpotService.POST_SELECT)
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("You've already shared this card.");
      if (error.code === "42501") throw new Error("Only members can share to the community.");
      throw new Error(`Couldn't share: ${error.message}`);
    }
    return (await this.rowsToPosts([data as unknown as Record<string, unknown>]))[0];
  }

  async setLike(postId: string, liked: boolean): Promise<void> {
    await this.init();
    if (liked) {
      const { error } = await this.client.from("post_likes").insert({ post_id: postId });
      if (error && error.code !== "23505") throw new Error(error.code === "42501" ? "Only members can like." : error.message);
    } else {
      const { data: s } = await this.client.auth.getSession();
      await this.client.from("post_likes").delete().eq("post_id", postId).eq("user_id", s.session?.user.id ?? "");
    }
  }

  async getSharedCatchIds(userId: string): Promise<Set<string>> {
    const { data } = await this.client.from("posts").select("catch_id").eq("user_id", userId);
    return new Set((data ?? []).map((d) => d.catch_id as string));
  }

  subscribePosts(onPost: (post: CommunityPost) => void): () => void {
    const ch = this.client
      .channel(`posts-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        // The realtime row has no joins — fetch the full post.
        const { data } = await this.client.from("posts").select(SupabaseFishingSpotService.POST_SELECT).eq("id", (payload.new as { id: string }).id).maybeSingle();
        if (data) {
          const [post] = await this.rowsToPosts([data as unknown as Record<string, unknown>]);
          if (post) onPost(post);
        }
      })
      .subscribe();
    return () => void this.client.removeChannel(ch);
  }

  async getFishIdQuota(): Promise<FishIdQuota> {
    await this.init();
    const { data, error } = await this.client.rpc("fishid_quota");
    if (error) throw new FishIdError("network");
    const row = Array.isArray(data) ? data[0] : data;
    return { unlimited: Boolean(row?.unlimited), remaining: Number(row?.remaining ?? 0), perUserLimit: Number(row?.per_user_limit ?? 5) };
  }

  async getCatches(userId: string): Promise<CatchCard[]> {
    const { data, error } = await this.client
      .from("catches")
      .select("id,user_id,card_no,species_common,species_scientific,icon_species,certainty,photo_path,place_name,wiki_url,caught_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new FishIdError("network");
    return (data as CatchRow[]).map((r) => rowToCatch(r, this.photoBase));
  }

  init(): Promise<void> {
    // Cap sign-in time: auth-js retries network errors for a long while, and reads don't need a session.
    this.initPromise ??= withTimeout(this.signIn(), AUTH_TIMEOUT_MS).catch(() => {
      this.authError = new SpotServiceError("Couldn't reach the FishPulse server to start a guest session.", "network");
    });
    return this.initPromise;
  }

  private async signIn() {
    const { data } = await this.client.auth.getSession();
    if (data.session) {
      await this.client.realtime.setAuth(); // make sure the socket carries the user token before subscribing
      return;
    }
    const { error } = await this.client.auth.signInAnonymously();
    if (!error) await this.client.realtime.setAuth();
    if (error) {
      // Reads still work for the anon role; only publishing needs a session.
      this.authError = new SpotServiceError(
        /disabled/i.test(error.message)
          ? "Anonymous sign-ins are disabled in this Supabase project (Auth → Providers → Anonymous)."
          : `Couldn't start a guest session. ${friendly(error.message)}`,
        "auth",
      );
      console.warn("[FishPulse]", this.authError.message);
    }
  }

  async getSpots(): Promise<FishingSpot[]> {
    await this.init();
    const { data, error } = await this.client
      .from(TABLE)
      .select(PUBLIC_COLUMNS)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(MAX_SPOTS);
    if (error) throw new SpotServiceError(`Couldn't load reports. ${friendly(error.message)}`, "network");
    return (data as unknown as FishingSpotRow[]).map(rowToSpot).filter((s): s is FishingSpot => s !== null);
  }

  async createSpot(input: CreateFishingSpotInput & { id: string }): Promise<FishingSpot> {
    await this.init();
    if (this.authError) {
      // Retry once in case the problem was transient.
      this.initPromise = null;
      this.authError = null;
      await this.init();
      if (this.authError) throw this.authError;
    }
    const payload = inputToInsert(input, input.ttlMinutes ?? this.ttlMinutes);
    const { data, error } = await this.client.from(TABLE).insert(payload).select(PUBLIC_COLUMNS).single();
    if (error) {
      if (/rate_limited/i.test(error.message))
        throw new SpotServiceError("Easy, captain — too many reports in a minute. Try again shortly.", "rate_limited");
      if (error.code === "23514" || error.code === "22001")
        throw new SpotServiceError("The server rejected this report as invalid.", "validation");
      if (error.code === "42501") throw new SpotServiceError("Only members can share spots. Join with an invite code.", "auth");
      throw new SpotServiceError(`Couldn't publish. ${friendly(error.message)}`, "network");
    }
    const spot = rowToSpot(data as unknown as FishingSpotRow);
    if (!spot) throw new SpotServiceError("Server returned an unexpected record.", "unknown");
    return spot;
  }

  // ── profiles ─────────────────────────────────────────────────────────────

  private async myId(): Promise<string | null> {
    await this.init();
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async getMyProfile(): Promise<Profile | null> {
    const id = await this.myId();
    if (!id) return null;
    const { data, error } = await this.client.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw profileErrorFromMessage(error.message);
    return data ? rowToProfile(data as ProfileRow) : null;
  }

  async registerGuest(color: string): Promise<Profile> {
    await this.init();
    const { data, error } = await this.client.rpc("register_guest", { p_color: color });
    if (error) throw profileErrorFromMessage(error.message);
    return rowToProfile(data as ProfileRow);
  }

  async registerMember(code: string, name: string, color: string): Promise<Profile> {
    await this.init();
    const { data, error } = await this.client.rpc("register_member", { p_code: code, p_name: name, p_color: color });
    if (error) throw profileErrorFromMessage(error.message);
    return rowToProfile(data as ProfileRow);
  }

  async isNameAvailable(name: string): Promise<boolean> {
    await this.init();
    const { data, error } = await this.client.rpc("is_name_available", { p_name: name });
    if (error) throw profileErrorFromMessage(error.message);
    return Boolean(data);
  }

  async getProfiles(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.client.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
    if (error) throw profileErrorFromMessage(error.message);
    return (data as ProfileRow[]).map(rowToProfile);
  }

  async getProfileStats(id: string): Promise<{ reportsCount: number }> {
    const { data, error } = await this.client.rpc("profile_stats", { p_id: id });
    if (error) throw profileErrorFromMessage(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return { reportsCount: Number(row?.reports_count ?? 0) };
  }

  /** Shared broadcast topic for "everyone refresh" signals. Not authoritative: it only triggers a re-fetch. */
  private control: RealtimeChannel | null = null;

  async adminClearSpots(): Promise<number> {
    await this.init();
    const { data, error } = await this.client.rpc("admin_clear_spots");
    if (error) throw new SpotServiceError(/not_admin/.test(error.message) ? "Admins only." : `Couldn't clear: ${error.message}`, "auth");
    await this.control?.send({ type: "broadcast", event: "refresh", payload: { reason: "cleared" } });
    return Number(data ?? 0);
  }

  subscribeToSpots(
    onSpot: (spot: FishingSpot) => void,
    onStatus?: (status: ConnectionStatus) => void,
    onRefresh?: () => void,
  ): () => void {
    // Control channel: admins broadcast "refresh" after clearing; every page re-fetches.
    const control = this.client.channel("fishpulse-control", { config: { broadcast: { self: true } } });
    control.on("broadcast", { event: "refresh" }, () => onRefresh?.()).subscribe();
    this.control = control;
    let channel: RealtimeChannel | null = null;
    let disposed = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      await this.init();
      if (disposed) return;
      onStatus?.(retry === 0 ? "connecting" : "reconnecting");
      const ch: RealtimeChannel = this.client
        .channel(`fishing-spots-${Math.random().toString(36).slice(2, 8)}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, (payload) => {
          const spot = rowToSpot(payload.new as FishingSpotRow);
          if (spot) onSpot(spot);
        });
      channel = ch;
      ch.subscribe((status, err) => {
          // Ignore callbacks from channels we've already replaced (removeChannel fires CLOSED).
          if (disposed || channel !== ch) return;
          if (status === "SUBSCRIBED") {
            retry = 0;
            onStatus?.("live");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (err) console.warn("[FishPulse] realtime:", status, err.message);
            scheduleReconnect();
          } else if (status === "CLOSED") {
            scheduleReconnect();
          }
        });
    };

    // Exponential backoff with a fresh channel, so a wedged socket can't stall us forever.
    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      onStatus?.(navigator.onLine === false ? "offline" : "reconnecting");
      const wait = Math.min(30_000, 1000 * 2 ** retry++);
      const old = channel;
      channel = null;
      if (old) void this.client.removeChannel(old);
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void connect();
      }, wait);
    };

    void connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      if (channel) void this.client.removeChannel(channel);
      void this.client.removeChannel(control);
      if (this.control === control) this.control = null;
    };
  }
}
