import type { AppConfig } from "../lib/config";
import type { FishingSpotService } from "./fishingSpotService";
import type { ProfileService } from "./profileService";
import type { FishIdService } from "./fishIdService";
import type { CommunityService } from "./communityService";
import { MockFishingSpotService } from "./mockFishingSpotService";
import { SupabaseFishingSpotService } from "./supabaseFishingSpotService";

/** Adapter selection happens here and nowhere else. */
export type AppDataService = FishingSpotService & ProfileService & FishIdService & CommunityService;

export function createFishingSpotService(cfg: AppConfig): AppDataService {
  if (cfg.dataMode === "live" && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    return new SupabaseFishingSpotService(cfg.supabaseUrl, cfg.supabaseAnonKey, cfg.reportTtlMinutes);
  }
  return new MockFishingSpotService({ center: cfg.defaultCenter, ttlMinutes: cfg.reportTtlMinutes });
}

export type { FishingSpotService } from "./fishingSpotService";
export { SpotServiceError } from "./fishingSpotService";
export { ProfileError, PROFILE_ERROR_COPY } from "./profileService";
export type { ProfileService } from "./profileService";
export { FishIdError, FISH_ID_ERROR_COPY } from "./fishIdService";
