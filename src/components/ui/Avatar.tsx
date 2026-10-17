import { initials } from "../../domain/profile";
import type { Profile } from "../../types/fishing";

/** Initials avatar (demo). `ring` adds a white outline for overlapping map badges. */
export function Avatar({ profile, name, size = 36, ring = false }: { profile?: Profile | null; name?: string; size?: number; ring?: boolean }) {
  const label = profile?.displayName ?? name ?? "?";
  const color = profile?.avatarColor ?? "#9aa6bb";
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-black text-white select-none"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(9, size * 0.42),
        boxShadow: ring ? "0 0 0 2px #fff, 0 2px 6px rgba(35,49,77,0.25)" : undefined,
      }}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  );
}
