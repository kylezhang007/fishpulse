import type { ActivityLevel } from "../types/fishing";

/** "Bass are biting hard" — the one-liner used in notifications. */
export function bitingPhrase(fishType: string, level: ActivityLevel): string {
  switch (level) {
    case "high":
      return `${fishType} are biting hard`;
    case "medium":
      return `${fishType} are biting`;
    case "low":
      return `A few ${fishType} around`;
  }
}
