import { ACTIVITY_LEVELS, type ActivityLevel, type CreateFishingSpotInput, type FishingSpot } from "../types/fishing";

/**
 * Row shape of `public.fishing_spots` (snake_case). This is the single, stable
 * mapping between PostgreSQL and the TypeScript domain model.
 * `creator_id` maps to `creatorId` so a spot can link to the reporter's public profile.
 */
export interface FishingSpotRow {
  id: string;
  latitude: number | string;
  longitude: number | string;
  username: string;
  fish_type: string;
  activity_level: string;
  note: string | null;
  is_approximate: boolean | null;
  created_at: string;
  expires_at: string;
  creator_id?: string;
}

export type FishingSpotInsert = Omit<FishingSpotRow, "created_at" | "creator_id" | "latitude" | "longitude"> & {
  latitude: number;
  longitude: number;
};

/** Columns we read. creator_id is public on purpose: it links to the (public) profile. */
export const PUBLIC_COLUMNS =
  "id,latitude,longitude,username,fish_type,activity_level,note,is_approximate,created_at,expires_at,creator_id";

/** Convert a DB/realtime record into the domain model. Returns null for malformed rows. */
export function rowToSpot(row: Partial<FishingSpotRow> | null | undefined): FishingSpot | null {
  if (!row || typeof row.id !== "string") return null;
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!ACTIVITY_LEVELS.includes(row.activity_level as ActivityLevel)) return null;
  if (!row.created_at || !row.expires_at) return null;
  return {
    id: row.id,
    latitude,
    longitude,
    username: row.username ?? "Angler",
    fishType: row.fish_type ?? "Fish",
    activityLevel: row.activity_level as ActivityLevel,
    note: row.note ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    isApproximate: Boolean(row.is_approximate),
    creatorId: row.creator_id ?? undefined,
  };
}

/**
 * Convert a validated create-input into an insert payload. created_at and creator_id
 * are set server-side by a trigger and can't be forged by the client.
 */
export function inputToInsert(
  input: CreateFishingSpotInput & { id: string },
  ttlMinutes: number,
  now: number = Date.now(),
): FishingSpotInsert {
  return {
    id: input.id,
    latitude: input.latitude,
    longitude: input.longitude,
    username: input.username,
    fish_type: input.fishType,
    activity_level: input.activityLevel,
    note: input.note ?? null,
    is_approximate: Boolean(input.isApproximate),
    expires_at: new Date(now + ttlMinutes * 60_000).toISOString(),
  };
}
