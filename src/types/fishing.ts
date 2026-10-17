/**
 * Core domain model. These types are shared by every layer (map, animation,
 * application, data) and must stay free of any backend-specific details.
 */

export type ActivityLevel = "low" | "medium" | "high";

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = ["low", "medium", "high"] as const;

export const ACTIVITY_META: Record<
  ActivityLevel,
  { label: string; short: string; emoji: string; color: string; soft: string; glow: string }
> = {
  low: { label: "A few nibbles", short: "Chill", emoji: "🙂", color: "#3fb2ff", soft: "#e3f4ff", glow: "rgba(63,178,255,0.45)" },
  medium: { label: "Steady bites", short: "Good", emoji: "😄", color: "#ffa51f", soft: "#fff3d6", glow: "rgba(255,165,31,0.5)" },
  high: { label: "Biting like crazy!", short: "On fire", emoji: "🤩", color: "#ff6b81", soft: "#ffe8ec", glow: "rgba(255,107,129,0.55)" },
};

/**
 * Species offered in the MVP. Kept deliberately short (each gets its own cartoon icon);
 * the form tells users more species are coming. The DB accepts any name, so adding
 * species later needs no migration.
 */
export const FISH_SPECIES = ["Bass", "Trout", "Salmon", "Catfish"] as const;

export interface FishingSpot {
  id: string;
  latitude: number;
  longitude: number;
  username: string;
  fishType: string;
  activityLevel: ActivityLevel;
  note?: string;
  /** ISO-8601 timestamp, set by the backend. */
  createdAt: string;
  /** ISO-8601 timestamp after which the spot is no longer a current hotspot. */
  expiresAt: string;
  /** True when the published coordinate was deliberately coarsened for privacy. */
  isApproximate?: boolean;
  /** True for seeded / simulated Demo Mode data. Never set for real reports. */
  isSample?: boolean;
  /** Auth user id of the reporter — links the spot to their public profile. */
  creatorId?: string;
}

export interface CreateFishingSpotInput {
  latitude: number;
  longitude: number;
  username: string;
  fishType: string;
  activityLevel: ActivityLevel;
  note?: string;
  isApproximate?: boolean;
  /**
   * Client-generated UUID. Lets the UI recognise its own report when the
   * realtime echo arrives before the insert response (dedup / idempotency).
   */
  id?: string;
  /** Requested lifetime. The backend clamps it to an allowed range. */
  ttlMinutes?: number;
}

/** How a spot entered the client — drives which animation plays. */
export type SpotArrival =
  | "initial" // part of the first load → quiet staggered entrance
  | "own" // published from this device → celebration burst
  | "discovery" // fresh report from someone else → sonar + notification
  | "quiet"; // late-arriving older report (e.g. after reconnect) → quiet entrance

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export interface LatLng {
  lat: number;
  lng: number;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export type UserRole = "guest" | "member" | "admin";

/** Public profile. Members joined with the shared invite code; guests can only browse. */
export interface Profile {
  id: string;
  displayName: string;
  role: UserRole;
  avatarColor: string;
  createdAt: string;
}

/** Shown on every profile during the demo (agreed with the team). */
export const DEMO_FISHING_CAREER = "2 days";

// ─── Fish ID / catch cards ──────────────────────────────────────────────────

/** A collectible card created by a successful Fish ID. */
export interface CatchCard {
  id: string;
  userId: string;
  cardNo: number;
  speciesCommon: string;
  speciesScientific?: string;
  /** One of FISH_SPECIES when we have a cartoon icon for it. */
  iconSpecies?: string;
  /** 0–1 AI certainty. */
  certainty?: number;
  photoUrl?: string;
  placeName?: string;
  wikiUrl?: string;
  caughtAt: string;
}

export interface FishIdQuota {
  unlimited: boolean;
  /** Demo Mode: simulated recognition, no credits. */
  demo?: boolean;
  remaining: number;
  perUserLimit: number;
}

export type FishIdResult = { found: true; card: CatchCard } | { found: false };
