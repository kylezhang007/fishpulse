import type { CatchCard, FishIdQuota, FishIdResult } from "../types/fishing";

export type FishIdErrorCode =
  | "members_only"
  | "quota_user"
  | "quota_global"
  | "out_of_credits"
  | "not_configured"
  | "bad_image"
  | "network"
  | "unknown";

export const FISH_ID_ERROR_COPY: Record<FishIdErrorCode, string> = {
  members_only: "Fish ID is for members.",
  quota_user: "You've used all your Fish IDs this month. More next month!",
  quota_global: "FishPulse has used this month's Fish IDs. Back next month!",
  out_of_credits: "The fish scanner is out of credits right now.",
  not_configured: "Fish ID isn't switched on yet.",
  bad_image: "That photo didn't work — try a clear JPG/PNG of the fish.",
  network: "Can't reach the fish scanner. Check your connection.",
  unknown: "Something went wrong identifying that fish.",
};

export class FishIdError extends Error {
  constructor(readonly code: FishIdErrorCode) {
    super(FISH_ID_ERROR_COPY[code]);
    this.name = "FishIdError";
  }
}

/** Fish ID + catch cards. Live: Supabase Edge Function → Fishial.ai. Demo: simulated, no credits. */
export interface FishIdService {
  identifyFish(image: Blob, placeName?: string): Promise<FishIdResult>;
  getFishIdQuota(): Promise<FishIdQuota>;
  getCatches(userId: string): Promise<CatchCard[]>;
}

export interface CatchRow {
  id: string;
  user_id: string;
  card_no: number;
  species_common: string;
  species_scientific: string | null;
  icon_species: string | null;
  certainty: number | null;
  photo_path: string | null;
  place_name: string | null;
  wiki_url: string | null;
  caught_at: string;
}

export function rowToCatch(row: CatchRow, photoBase: string): CatchCard {
  return {
    id: row.id,
    userId: row.user_id,
    cardNo: row.card_no,
    speciesCommon: row.species_common,
    speciesScientific: row.species_scientific ?? undefined,
    iconSpecies: row.icon_species ?? undefined,
    certainty: row.certainty ?? undefined,
    photoUrl: row.photo_path ? `${photoBase}/${row.photo_path}` : undefined,
    placeName: row.place_name ?? undefined,
    wikiUrl: row.wiki_url ?? undefined,
    caughtAt: new Date(row.caught_at).toISOString(),
  };
}
