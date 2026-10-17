import { motion, useReducedMotion } from "motion/react";
import { memo, type CSSProperties } from "react";
import { FishDiscoveryAnimation } from "../animations/FishDiscoveryAnimation";
import { SpeciesIcon } from "../animations/SpeciesIcon";
import { Bubbles, SonarPulse } from "../animations/SonarPulse";
import { ACTIVITY_META, type FishingSpot, type Profile, type SpotArrival } from "../../types/fishing";
import { Avatar } from "../ui/Avatar";

export interface HotspotMarkerProps {
  spot: FishingSpot;
  /** Set while an entrance animation should play; cleared by the app afterwards. */
  arrival?: SpotArrival;
  /** Stagger index for the quiet initial entrance. */
  index: number;
  selected: boolean;
  /** 1 → brand new, 0 → expiring. Older reports fade. */
  freshness: number;
  /** Reporter's public profile, shown as a tiny avatar badge. */
  reporter?: Profile;
  onSelect: (id: string) => void;
}

/**
 * Visual for one hotspot: a white bubble with a little fish inside, ringed in the
 * activity colour. Rendered (via portal) into a MapLibre Marker element, so it
 * stays locked to its coordinate during pan/zoom without any per-frame JS.
 */
export const HotspotMarker = memo(function HotspotMarker({ spot, arrival, index, selected, freshness, onSelect, reporter }: HotspotMarkerProps) {
  const reduce = useReducedMotion();
  const meta = ACTIVITY_META[spot.activityLevel];
  const loud = arrival === "discovery" || arrival === "own";
  const opacity = selected ? 1 : 0.55 + 0.45 * freshness;

  // Springy "boing" entrances.
  const entrance = reduce
    ? { initial: { opacity: 0 }, animate: { opacity } }
    : loud
      ? { initial: { scale: 0, y: -30, opacity: 0 }, animate: { scale: 1, y: 0, opacity } }
      : { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity } };

  return (
    <button
      type="button"
      className="fp-marker"
      data-level={spot.activityLevel}
      data-selected={selected || undefined}
      style={{ "--fp-color": meta.color } as CSSProperties}
      aria-label={`${spot.fishType}, ${meta.label}, reported by ${spot.username}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spot.id);
      }}
    >
      {loud && <SonarPulse color={meta.color} mode="burst" />}
      {!loud && spot.activityLevel === "high" && !reduce && (
        <>
          <SonarPulse color={meta.color} mode="idle" size={66} />
          <Bubbles />
        </>
      )}
      {arrival === "own" && <FishDiscoveryAnimation color={meta.color} species={spot.fishType} />}
      {spot.isApproximate && <span className="fp-approx-ring" aria-hidden="true" />}
      <motion.span
        className="fp-core"
        {...entrance}
        transition={
          reduce
            ? { duration: 0.3 }
            : {
                type: "spring",
                stiffness: loud ? 380 : 420,
                damping: loud ? 11 : 16,
                delay: arrival === "own" ? 1.25 : arrival === "initial" ? 0.2 + index * 0.07 : 0,
              }
        }
      >
        <span className="fp-core-inner">
          <SpeciesIcon species={spot.fishType} size={30} />
        </span>
        <span className="absolute -top-2 -right-2">
          <Avatar profile={reporter} name={spot.username} size={18} ring />
        </span>
      </motion.span>
      {selected && <span className="fp-selected-ring" aria-hidden="true" />}
    </button>
  );
});
