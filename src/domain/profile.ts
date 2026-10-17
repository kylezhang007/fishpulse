/** Avatar palette — bright, readable with white initials. */
export const AVATAR_COLORS = ["#ff6b81", "#3fb2ff", "#ffa51f", "#2fd39a", "#a78bfa", "#ff8a5c", "#14b8c4", "#e879a6"];

/** "Alex" → "A", "Maya Chen" → "MC", "Guest-4821" → "G". */
export function initials(name: string): string {
  const words = name.trim().split(/[\s_-]+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1 || /^\d+$/.test(words[1])) return [...words[0]][0].toUpperCase();
  return ([...words[0]][0] + [...words[1]][0]).toUpperCase();
}

/** Stable colour per name, so the same angler always looks the same. */
export function colorForName(name: string): string {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const NAME_MIN = 2;
export const NAME_MAX = 20;

/** Client-side name check (the database enforces the same rules + uniqueness). */
export function validateDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN) return `At least ${NAME_MIN} characters`;
  if (name.length > NAME_MAX) return `At most ${NAME_MAX} characters`;
  if (/^guest-/i.test(name)) return "That name is reserved for guests";
  return null;
}

/** Whole days since an ISO date, at least 1 ("day 1" on the day you join). */
export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.max(1, Math.floor((now - Date.parse(iso)) / 86_400_000) + 1);
}
