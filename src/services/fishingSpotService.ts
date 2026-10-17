import type { ConnectionStatus, CreateFishingSpotInput, FishingSpot } from "../types/fishing";

/**
 * The only contract the application layer knows about. Demo and Live adapters both
 * implement it, so every UI component and animation is shared between modes.
 */
export interface FishingSpotService {
  readonly mode: "demo" | "live";
  /** Human-readable description of what "realtime" means for this adapter. */
  readonly syncScope: string;

  /** Prepare the adapter (e.g. anonymous sign-in). Safe to call more than once. */
  init(): Promise<void>;

  /** Currently active (non-expired) spots. */
  getSpots(): Promise<FishingSpot[]>;

  /** Persist a report. Resolves only after the backend confirms it was saved. */
  createSpot(input: CreateFishingSpotInput & { id: string }): Promise<FishingSpot>;

  /**
   * Receive spots created elsewhere. May deliver duplicates or the caller's own
   * reports — consumers must dedupe by id. Returns an unsubscribe function.
   */
  subscribeToSpots(
    onSpot: (spot: FishingSpot) => void,
    onStatus?: (status: ConnectionStatus) => void,
    /** Server says "reload everything" (e.g. an admin cleared the map). */
    onRefresh?: () => void,
  ): () => void;

  /** Demo-only: inject a sample sighting through the same event path as real reports. */
  simulateSighting?(): Promise<FishingSpot>;
}

export class SpotServiceError extends Error {
  constructor(
    message: string,
    readonly code: "rate_limited" | "auth" | "validation" | "network" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "SpotServiceError";
  }
}
