import type { FishingSpot, SpotArrival } from "../types/fishing";

/** Reports newer than this that arrive after initial load trigger the full discovery treatment. */
export const DISCOVERY_WINDOW_MS = 3 * 60_000;

export function isSpotActive(spot: FishingSpot, now: number = Date.now()): boolean {
  const expires = Date.parse(spot.expiresAt);
  return Number.isFinite(expires) && expires > now;
}

/** 1 → just reported, 0 → about to expire. Used to fade markers as reports age. */
export function spotFreshness(spot: FishingSpot, now: number = Date.now()): number {
  const created = Date.parse(spot.createdAt);
  const expires = Date.parse(spot.expiresAt);
  const span = expires - created;
  if (!Number.isFinite(span) || span <= 0) return 0;
  return Math.min(1, Math.max(0, (expires - now) / span));
}

/**
 * Merge incoming spots into the current list: dedupe by id (existing wins),
 * drop expired entries, newest first. Pure — safe to use inside setState.
 */
export function mergeSpots(
  current: readonly FishingSpot[],
  incoming: readonly FishingSpot[],
  now: number = Date.now(),
): FishingSpot[] {
  const byId = new Map<string, FishingSpot>();
  for (const s of current) byId.set(s.id, s);
  for (const s of incoming) if (!byId.has(s.id)) byId.set(s.id, s);
  return [...byId.values()]
    .filter((s) => isSpotActive(s, now))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Returns the same array instance when nothing expired, so React can skip a render. */
export function pruneExpired(spots: FishingSpot[], now: number = Date.now()): FishingSpot[] {
  const kept = spots.filter((s) => isSpotActive(s, now));
  return kept.length === spots.length ? spots : kept;
}

export type SpotSource = "initial" | "realtime" | "backfill" | "own";

export function classifyArrival(
  spot: FishingSpot,
  opts: { source: SpotSource; isOwn: boolean; now?: number },
): SpotArrival {
  if (opts.source === "initial") return "initial";
  if (opts.isOwn || opts.source === "own") return "own";
  const age = (opts.now ?? Date.now()) - Date.parse(spot.createdAt);
  return age <= DISCOVERY_WINDOW_MS ? "discovery" : "quiet";
}

/**
 * Tracks ids the client has already processed so that realtime echoes,
 * reconnect backfills and duplicate deliveries never re-trigger animations
 * or notifications.
 */
export class SeenRegistry {
  private seen = new Set<string>();
  /** Returns true the first time an id is offered. */
  markIfNew(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    return true;
  }
  has(id: string): boolean {
    return this.seen.has(id);
  }
}
