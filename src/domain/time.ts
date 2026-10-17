export function formatAgo(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ago`;
}

export function formatRemaining(iso: string, now: number = Date.now()): string {
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000));
  if (m <= 1) return "expiring";
  return `${m} min left`;
}
