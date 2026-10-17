import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "../domain/id";
import { classifyArrival, isSpotActive, mergeSpots, pruneExpired, SeenRegistry, type SpotSource } from "../domain/spots";
import { hasErrors, normalizeInput, validateSpotInput } from "../domain/validation";
import type { FishingSpotService } from "../services";
import { SpotServiceError } from "../services";
import type { ConnectionStatus, CreateFishingSpotInput, FishingSpot, SpotArrival } from "../types/fishing";

export type LoadState = "loading" | "ready" | "error";

const PRUNE_INTERVAL_MS = 10_000;
const FALLBACK_POLL_MS = 20_000;

/**
 * Bridges the data service and the UI.
 *
 * - Initial load is kept separate from incoming events (quiet vs. discovery animation).
 * - Every spot id is processed once (SeenRegistry) → no duplicate markers/notifications.
 * - Expired spots are pruned on a timer.
 * - On reconnect / tab refocus we backfill once; polling only runs while realtime is down.
 */
export function useFishingSpots(
  service: FishingSpotService,
  opts: { ttlMinutes: number; onArrival?: (spot: FishingSpot, arrival: SpotArrival) => void },
) {
  const [spots, setSpots] = useState<FishingSpot[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");

  const seen = useRef(new SeenRegistry());
  const ownIds = useRef(new Set<string>());
  const initialDone = useRef(false);
  const onArrivalRef = useRef(opts.onArrival);
  onArrivalRef.current = opts.onArrival;

  const ingest = useCallback((incoming: FishingSpot[], source: SpotSource) => {
    const now = Date.now();
    const fresh = incoming.filter((s) => isSpotActive(s, now) && seen.current.markIfNew(s.id));
    if (fresh.length === 0) return;
    setSpots((prev) => mergeSpots(prev, fresh, now));
    for (const s of fresh) {
      onArrivalRef.current?.(s, classifyArrival(s, { source, isOwn: ownIds.current.has(s.id), now }));
    }
  }, []);

  /** Replace (not merge) with the server's current list — used when spots were deleted. */
  const refreshAll = useCallback(async () => {
    try {
      const fresh = await service.getSpots();
      const ids = new Set(fresh.map((s) => s.id));
      setSpots((prev) => prev.filter((s) => ids.has(s.id)));
      ingest(fresh, "backfill");
    } catch (e) {
      console.warn("[FishPulse] refresh failed", e);
    }
  }, [service, ingest]);

  const backfill = useCallback(async () => {
    if (!initialDone.current) return;
    try {
      ingest(await service.getSpots(), "backfill");
    } catch (e) {
      console.warn("[FishPulse] backfill failed", e);
    }
  }, [service, ingest]);

  const loadInitial = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      await service.init();
      const initial = await service.getSpots();
      ingest(initial, "initial");
      initialDone.current = true;
      setLoadState("ready");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load reports.");
      setLoadState("error");
    }
  }, [service, ingest]);

  // Subscribe first, then load: anything arriving in between is deduped by id.
  useEffect(() => {
    let wasLive = false;
    const unsubscribe = service.subscribeToSpots(
      (spot) => ingest([spot], initialDone.current ? "realtime" : "backfill"),
      (status) => {
        setConnection(status);
        if (status === "live") {
          if (wasLive === false && initialDone.current) void backfill(); // catch up on missed inserts
          wasLive = true;
        } else {
          wasLive = false;
        }
      },
      () => void refreshAll(),
    );
    void loadInitial();
    return unsubscribe;
  }, [service, ingest, loadInitial, backfill, refreshAll]);

  // Expiry: timestamps decide, the timer only re-evaluates them.
  useEffect(() => {
    const t = setInterval(() => setSpots((prev) => pruneExpired(prev)), PRUNE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  // Mobile browsers suspend sockets in background tabs → backfill on return.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void backfill();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [backfill]);

  // Graceful degradation: poll only while realtime is unavailable.
  useEffect(() => {
    if (connection === "live" || loadState !== "ready") return;
    const t = setInterval(() => void backfill(), FALLBACK_POLL_MS);
    return () => clearInterval(t);
  }, [connection, loadState, backfill]);

  const createSpot = useCallback(
    async (raw: CreateFishingSpotInput): Promise<FishingSpot> => {
      const input = normalizeInput(raw);
      if (hasErrors(validateSpotInput(input))) throw new SpotServiceError("Please fix the highlighted fields.", "validation");
      const id = createId();
      ownIds.current.add(id); // register before the network call: the realtime echo may win the race
      const spot = await service.createSpot({ ...input, id, ttlMinutes: opts.ttlMinutes });
      ingest([spot], "own");
      return spot;
    },
    [service, ingest, opts.ttlMinutes],
  );

  const simulate = service.simulateSighting ? () => service.simulateSighting!() : undefined;

  return { spots, loadState, loadError, connection, createSpot, retry: loadInitial, simulate, refreshAll };
}
