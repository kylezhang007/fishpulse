import { ACTIVITY_META, type ActivityLevel } from "../../types/fishing";

/** Three little "fish bars" showing how lively a spot is. */
export function ActivityIndicator({ level, showLabel = true }: { level: ActivityLevel; showLabel?: boolean }) {
  const meta = ACTIVITY_META[level];
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{ background: meta.soft }}
      aria-label={`${meta.label}`}
    >
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-[5px] rounded-full transition-colors duration-300"
            style={{ height: 4 + i * 3.5, background: i <= filled ? meta.color : "rgba(35,49,77,0.12)" }}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-xs font-extrabold" style={{ color: meta.color }}>
          {meta.short}
        </span>
      )}
    </span>
  );
}
