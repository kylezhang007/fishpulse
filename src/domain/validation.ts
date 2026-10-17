import { ACTIVITY_LEVELS, type CreateFishingSpotInput } from "../types/fishing";
import { isValidCoordinate } from "./location";

export const LIMITS = {
  usernameMax: 24,
  fishTypeMax: 40,
  noteMax: 140,
} as const;

export const GUEST_NAME = "Guest angler";

export type ValidationErrors = Partial<Record<"location" | "username" | "fishType" | "activityLevel" | "note", string>>;

/** Trim + normalise user input. Empty display name falls back to a guest label. */
export function normalizeInput(input: CreateFishingSpotInput): CreateFishingSpotInput {
  const note = input.note?.trim().replace(/\s+/g, " ");
  return {
    ...input,
    username: input.username.trim().replace(/\s+/g, " ") || GUEST_NAME,
    fishType: input.fishType.trim(),
    note: note ? note : undefined,
  };
}

export function validateSpotInput(input: CreateFishingSpotInput): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!isValidCoordinate(input.latitude, input.longitude)) errors.location = "Pick a valid spot on the map.";
  if (input.username.trim().length > LIMITS.usernameMax)
    errors.username = `Keep your name under ${LIMITS.usernameMax} characters.`;
  if (!input.fishType.trim()) errors.fishType = "Choose what's biting.";
  else if (input.fishType.trim().length > LIMITS.fishTypeMax) errors.fishType = "Species name is too long.";
  if (!ACTIVITY_LEVELS.includes(input.activityLevel)) errors.activityLevel = "Choose an activity level.";
  if ((input.note?.trim().length ?? 0) > LIMITS.noteMax) errors.note = `Notes are limited to ${LIMITS.noteMax} characters.`;
  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
