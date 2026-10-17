import { createId } from "../domain/id";
import { colorForName } from "../domain/profile";
import { isSpotActive } from "../domain/spots";
import { hasErrors, validateSpotInput } from "../domain/validation";
import {
  FISH_SPECIES,
  type ActivityLevel,
  type ConnectionStatus,
  type CreateFishingSpotInput,
  type FishingSpot,
  type LatLng,
  type Profile,
  type CatchCard,
  type FishIdQuota,
  type FishIdResult,
} from "../types/fishing";
import { FishIdError, type FishIdService } from "./fishIdService";
import { SpotServiceError, type FishingSpotService } from "./fishingSpotService";
import { PROFILE_ERROR_COPY, ProfileError, type ProfileService } from "./profileService";

/**
 * DEMO MODE adapter.
 *
 * - Seeds realistic sample reports around the configured demo area.
 * - Persists to localStorage so reloads keep state.
 * - Syncs between tabs of the SAME browser via BroadcastChannel.
 *
 * This is NOT network realtime: two phones in Demo Mode never see each other.
 * Use Live Mode (Supabase) for genuine cross-device sync.
 */

const STORAGE_KEY = "fishpulse.demo.spots.v1";
const ME_KEY = "fishpulse.demo.me.v1";
const demoId = (name: string) => `demo-${name.toLowerCase()}`;
const CHANNEL = "fishpulse-demo";
const LATENCY_MS = 350;

/**
 * Seed offsets (Δlat, Δlng) from the demo centre. Tuned so they land on open water
 * for the default Lake Tahoe centre; with another centre pick a large lake or adjust.
 */
const SEEDS: Array<{ d: [number, number]; ageMin: number; user: string; fish: string; level: ActivityLevel; note?: string }> = [
  { d: [0.06, -0.03], ageMin: 2, user: "Maya", fish: "Trout", level: "high", note: "Rainbows on the drop-off, ~30 ft." },
  { d: [-0.04, 0.03], ageMin: 6, user: "Jordan", fish: "Salmon", level: "medium", note: "Trolling pink dodgers." },
  { d: [0.11, 0.02], ageMin: 9, user: "Sam", fish: "Bass", level: "high", note: "Smallmouth busting on top!" },
  { d: [-0.09, -0.02], ageMin: 14, user: "Priya", fish: "Trout", level: "low" },
  { d: [0.02, 0.06], ageMin: 18, user: "Diego", fish: "Bass", level: "medium", note: "Rocky point, tube jigs." },
  { d: [0.03, -0.07], ageMin: 22, user: "Kai", fish: "Salmon", level: "medium" },
  { d: [-0.02, -0.05], ageMin: 25, user: "Lena", fish: "Catfish", level: "low", note: "Small but steady." },
  { d: [0.09, -0.05], ageMin: 11, user: "Theo", fish: "Salmon", level: "high" },
];

const SIM_USERS = ["Alex", "Maya", "Jordan", "Sam", "Priya", "Diego", "Kai", "Lena", "Rowan", "Nia"];
const SIM_NOTES = [
  "Just landed two in five minutes!",
  "School breaking the surface near the buoy.",
  "Birds diving — bait is up.",
  "Slow retrieve is working.",
  undefined,
  undefined,
];

type ChannelMessage = { type: "spot"; spot: FishingSpot; origin: string };

export class MockFishingSpotService implements FishingSpotService, ProfileService, FishIdService {
  readonly mode = "demo" as const;
  readonly syncScope = "Demo Mode · syncs between tabs of this browser only";

  private spots: FishingSpot[] = [];
  private listeners = new Set<(spot: FishingSpot) => void>();
  private channel: BroadcastChannel | null = null;
  private readonly tabId = createId();
  private initialized = false;

  constructor(private readonly opts: { center: LatLng; ttlMinutes: number }) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.spots = this.load().filter((s) => isSpotActive(s));
    if (this.spots.filter((s) => s.isSample).length < 6) {
      this.spots = [...this.spots.filter((s) => !s.isSample), ...this.seed()];
      this.save();
    }
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (ev: MessageEvent<ChannelMessage>) => {
        const msg = ev.data;
        if (msg?.type !== "spot" || msg.origin === this.tabId) return;
        this.remember(msg.spot);
        this.emit(msg.spot);
      };
    }
  }

  async getSpots(): Promise<FishingSpot[]> {
    await delay(LATENCY_MS);
    // Re-read storage so a tab that slept picks up reports made in other tabs.
    for (const s of this.load()) this.remember(s);
    this.spots = this.spots.filter((s) => isSpotActive(s));
    return [...this.spots];
  }

  async createSpot(input: CreateFishingSpotInput & { id: string }): Promise<FishingSpot> {
    await delay(LATENCY_MS + 250);
    if (hasErrors(validateSpotInput(input))) throw new SpotServiceError("Report failed validation.", "validation");
    const me = this.loadMe() ?? this.memoryMe;
    if (me?.role !== "member") throw new SpotServiceError("Only members can share spots. Join with an invite code.", "auth");
    const now = Date.now();
    const ttl = input.ttlMinutes ?? this.opts.ttlMinutes;
    const spot: FishingSpot = {
      id: input.id,
      latitude: input.latitude,
      longitude: input.longitude,
      username: input.username,
      fishType: input.fishType,
      activityLevel: input.activityLevel,
      note: input.note,
      isApproximate: input.isApproximate,
      creatorId: me.id,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl * 60_000).toISOString(),
    };
    this.remember(spot);
    this.broadcast(spot);
    return spot;
  }

  subscribeToSpots(onSpot: (spot: FishingSpot) => void, onStatus?: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(onSpot);
    onStatus?.("live");
    return () => this.listeners.delete(onSpot);
  }

  /** Creates a clearly-labelled sample report and delivers it exactly like a remote one. */
  async simulateSighting(): Promise<FishingSpot> {
    const now = Date.now();
    const { lat, lng } = this.opts.center;
    const simUser = pick(SIM_USERS);
    const spot: FishingSpot = {
      id: createId(),
      latitude: round6(lat + (Math.random() * 2 - 1) * 0.08),
      longitude: round6(lng + (Math.random() * 2 - 1) * 0.045),
      username: simUser,
      creatorId: demoId(simUser),
      fishType: pick(FISH_SPECIES),
      activityLevel: pick<ActivityLevel>(["high", "high", "medium", "low"]),
      note: pick(SIM_NOTES),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.opts.ttlMinutes * 60_000).toISOString(),
      isSample: true,
    };
    await delay(150);
    this.remember(spot);
    this.broadcast(spot);
    this.emit(spot);
    return spot;
  }

  // ── profiles (Demo: any non-empty invite code works; nothing secret ships in the bundle) ──

  private demoProfiles(): Profile[] {
    const names = [...new Set([...SEEDS.map((s) => s.user), ...SIM_USERS])];
    return names.map((name, i) => ({
      id: demoId(name),
      displayName: name,
      role: "member" as const,
      avatarColor: colorForName(name),
      createdAt: new Date(Date.now() - (3 + ((i * 7) % 40)) * 86_400_000).toISOString(),
    }));
  }

  private loadMe(): Profile | null {
    try {
      const raw = localStorage.getItem(ME_KEY);
      return raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      return null;
    }
  }

  private saveMe(p: Profile) {
    try {
      localStorage.setItem(ME_KEY, JSON.stringify(p));
    } catch {
      /* private mode — profile lives for this page only */
    }
    this.memoryMe = p;
  }

  private memoryMe: Profile | null = null;

  async getMyProfile(): Promise<Profile | null> {
    return this.loadMe() ?? this.memoryMe;
  }

  async registerGuest(color: string): Promise<Profile> {
    const existing = await this.getMyProfile();
    if (existing) return existing;
    const me: Profile = {
      id: `demo-me-${createId()}`,
      displayName: `Guest-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      role: "guest",
      avatarColor: color,
      createdAt: new Date().toISOString(),
    };
    this.saveMe(me);
    return me;
  }

  async registerMember(code: string, name: string, color: string): Promise<Profile> {
    await delay(LATENCY_MS);
    const existing = await this.getMyProfile();
    if (existing?.role === "member") return existing;
    if (!code.trim()) throw new ProfileError(PROFILE_ERROR_COPY.invalid_code, "invalid_code");
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 20 || /^guest-/i.test(clean)) throw new ProfileError(PROFILE_ERROR_COPY.name_invalid, "name_invalid");
    if (!(await this.isNameAvailable(clean))) throw new ProfileError(PROFILE_ERROR_COPY.name_taken, "name_taken");
    const me: Profile = {
      id: existing?.id ?? `demo-me-${createId()}`,
      displayName: clean,
      role: "member",
      avatarColor: color,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.saveMe(me);
    return me;
  }

  async isNameAvailable(name: string): Promise<boolean> {
    const n = name.trim().toLowerCase();
    return !this.demoProfiles().some((p) => p.displayName.toLowerCase() === n);
  }

  async getProfiles(ids: string[]): Promise<Profile[]> {
    const me = await this.getMyProfile();
    const all = [...this.demoProfiles(), ...(me ? [me] : [])];
    return all.filter((p) => ids.includes(p.id));
  }

  async getProfileStats(id: string): Promise<{ reportsCount: number }> {
    return { reportsCount: this.spots.filter((s) => s.creatorId === id).length };
  }

  // ── Fish ID (Demo: simulated, uses no Fishial credits) ───────────────────

  private static SCI: Record<string, string> = {
    Bass: "Micropterus salmoides",
    Trout: "Oncorhynchus mykiss",
    Salmon: "Oncorhynchus nerka",
    Catfish: "Ictalurus punctatus",
  };
  private static COMMON: Record<string, string> = {
    Bass: "Largemouth bass",
    Trout: "Rainbow trout",
    Salmon: "Sockeye salmon",
    Catfish: "Channel catfish",
  };

  private loadCatches(): CatchCard[] {
    try {
      return JSON.parse(localStorage.getItem("fishpulse.demo.catches.v1") ?? "[]") as CatchCard[];
    } catch {
      return this.memoryCatches;
    }
  }
  private memoryCatches: CatchCard[] = [];

  async identifyFish(image: Blob, placeName?: string): Promise<FishIdResult> {
    const me = this.loadMe() ?? this.memoryMe;
    if (!me || me.role === "guest") throw new FishIdError("members_only");
    await delay(1600);
    const species = pick(FISH_SPECIES);
    const photoUrl = await new Promise<string | undefined>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : undefined);
      r.onerror = () => resolve(undefined);
      r.readAsDataURL(image);
    }).catch(() => undefined);
    const all = this.loadCatches();
    const card: CatchCard = {
      id: createId(),
      userId: me.id,
      cardNo: all.filter((c) => c.userId === me.id).length + 1,
      speciesCommon: MockFishingSpotService.COMMON[species],
      speciesScientific: MockFishingSpotService.SCI[species],
      iconSpecies: species,
      certainty: 0.82 + Math.random() * 0.15,
      photoUrl,
      placeName,
      wikiUrl: `https://en.wikipedia.org/wiki/${MockFishingSpotService.SCI[species].replace(/ /g, "_")}`,
      caughtAt: new Date().toISOString(),
    };
    const next = [card, ...all];
    this.memoryCatches = next;
    try {
      localStorage.setItem("fishpulse.demo.catches.v1", JSON.stringify(next.slice(0, 12)));
    } catch {
      /* photo data URLs can exceed storage — keep in memory */
    }
    return { found: true, card };
  }

  async getFishIdQuota(): Promise<FishIdQuota> {
    return { unlimited: true, demo: true, remaining: 0, perUserLimit: 5 };
  }

  async getCatches(userId: string): Promise<CatchCard[]> {
    return this.loadCatches().filter((c) => c.userId === userId);
  }

  // ── internals ────────────────────────────────────────────────────────────

  private seed(): FishingSpot[] {
    const now = Date.now();
    const { lat, lng } = this.opts.center;
    return SEEDS.map((s) => {
      const created = now - s.ageMin * 60_000;
      return {
        id: createId(),
        latitude: round6(lat + s.d[0]),
        longitude: round6(lng + s.d[1]),
        username: s.user,
        creatorId: demoId(s.user),
        fishType: s.fish,
        activityLevel: s.level,
        note: s.note,
        createdAt: new Date(created).toISOString(),
        expiresAt: new Date(created + this.opts.ttlMinutes * 60_000).toISOString(),
        isSample: true,
      };
    });
  }

  private remember(spot: FishingSpot) {
    if (this.spots.some((s) => s.id === spot.id)) return;
    this.spots = [spot, ...this.spots];
    this.save();
  }

  private emit(spot: FishingSpot) {
    for (const l of this.listeners) l(spot);
  }

  private broadcast(spot: FishingSpot) {
    this.channel?.postMessage({ type: "spot", spot, origin: this.tabId } satisfies ChannelMessage);
  }

  private load(): FishingSpot[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as FishingSpot[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.spots.filter((s) => isSpotActive(s)).slice(0, 200)));
    } catch {
      /* storage may be unavailable (private mode) — in-memory still works */
    }
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
