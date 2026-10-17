import type { Profile } from "../types/fishing";

export type ProfileErrorCode = "invalid_code" | "code_full" | "name_taken" | "name_invalid" | "network" | "unknown";

export class ProfileError extends Error {
  constructor(message: string, readonly code: ProfileErrorCode) {
    super(message);
    this.name = "ProfileError";
  }
}

export const PROFILE_ERROR_COPY: Record<ProfileErrorCode, string> = {
  invalid_code: "That invite code doesn't work.",
  code_full: "This invite code has reached its member limit.",
  name_taken: "That name is taken — try another.",
  name_invalid: "Pick a name with 2–20 characters.",
  network: "Can't reach FishPulse right now. Try again.",
  unknown: "Something went wrong. Try again.",
};

/**
 * Accounts for the demo: a shared invite code makes you a member (unique name);
 * everyone else is a guest who can only browse. Implemented by both adapters.
 */
export interface ProfileService {
  getMyProfile(): Promise<Profile | null>;
  registerGuest(color: string): Promise<Profile>;
  registerMember(code: string, name: string, color: string): Promise<Profile>;
  isNameAvailable(name: string): Promise<boolean>;
  getProfiles(ids: string[]): Promise<Profile[]>;
  getProfileStats(id: string): Promise<{ reportsCount: number }>;
  /** Admin only: delete every hotspot and tell all open pages to refresh. Live Mode only. */
  adminClearSpots?(): Promise<number>;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  role: string;
  avatar_color: string;
  created_at: string;
}

export const PROFILE_COLUMNS = "id,display_name,role,avatar_color,created_at";

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role === "admin" ? "admin" : row.role === "member" ? "member" : "guest",
    avatarColor: row.avatar_color,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Map a Postgres error message (raised by register_member) to a friendly code. */
export function profileErrorFromMessage(message: string): ProfileError {
  const code = (["invalid_code", "code_full", "name_taken", "name_invalid"] as const).find((c) => message.includes(c));
  if (code) return new ProfileError(PROFILE_ERROR_COPY[code], code);
  if (/fetch|network/i.test(message)) return new ProfileError(PROFILE_ERROR_COPY.network, "network");
  return new ProfileError(PROFILE_ERROR_COPY.unknown, "unknown");
}
