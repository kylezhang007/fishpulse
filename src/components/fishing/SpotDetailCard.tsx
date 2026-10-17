import { motion } from "motion/react";
import { distanceMeters, formatDistance } from "../../domain/location";
import { formatAgo, formatRemaining } from "../../domain/time";
import { ACTIVITY_META, type FishingSpot, type LatLng, type Profile } from "../../types/fishing";
import { Avatar } from "../ui/Avatar";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { BottomSheet } from "../ui/BottomSheet";
import { ActivityIndicator } from "./ActivityIndicator";

export function SpotDetailCard({
  spot,
  now,
  userLocation,
  onViewSpot,
  reporter,
  onOpenProfile,
  onClose,
  onHeightChange,
}: {
  spot: FishingSpot;
  now: number;
  userLocation: LatLng | null;
  onViewSpot: () => void;
  reporter?: Profile;
  onOpenProfile?: (id: string) => void;
  onClose: () => void;
  onHeightChange: (h: number) => void;
}) {
  const meta = ACTIVITY_META[spot.activityLevel];
  const distance = userLocation ? distanceMeters(userLocation, { lat: spot.latitude, lng: spot.longitude }) : null;

  return (
    <BottomSheet label={`${spot.fishType} hotspot details`} onHeightChange={onHeightChange}>
      <div className="flex items-start gap-3">
        <motion.span
          key={spot.id}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px]"
          style={{ background: meta.soft }}
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
        >
          <SpeciesIcon species={spot.fishType} size={46} className="fp-bob" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-[22px] leading-tight font-extrabold text-ink">{spot.fishType}</h2>
            <ActivityIndicator level={spot.activityLevel} />
          </div>
          <button
            className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink-soft disabled:cursor-default"
            onClick={() => spot.creatorId && onOpenProfile?.(spot.creatorId)}
            disabled={!spot.creatorId || !onOpenProfile}
            aria-label={`Open ${reporter?.displayName ?? spot.username}'s profile`}
          >
            <Avatar profile={reporter} name={spot.username} size={22} />
            <span className="font-extrabold text-ink underline decoration-sky/40 decoration-2 underline-offset-2">{reporter?.displayName ?? spot.username}</span>
            <span>· {formatAgo(spot.createdAt, now)}</span>
          </button>
        </div>
        <button onClick={onClose} className="icon-btn icon-btn--sm" aria-label="Close details">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {spot.note && (
        <p className="relative mt-3 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm font-semibold text-ink" style={{ background: meta.soft }}>
          “{spot.note}”
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="tag">
          {meta.emoji} {meta.label}
        </span>
        <span className="tag">⏳ {formatRemaining(spot.expiresAt, now)}</span>
        {distance !== null && <span className="tag">🧭 {formatDistance(distance)} away</span>}
        {spot.isApproximate && <span className="tag tag--dashed">🫧 Rough area (~300 m)</span>}
        {spot.isSample && <span className="tag tag--amber">Sample data</span>}
      </div>

      <button className="btn-sky mt-4 w-full" onClick={onViewSpot}>
        🗺️ View spot on map
      </button>
      <p className="mt-2 text-center text-[10px] font-semibold text-ink-mute">Shared by the community · not verified · fish move fast!</p>
    </BottomSheet>
  );
}
