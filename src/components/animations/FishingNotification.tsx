import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { bitingPhrase } from "../../domain/copy";
import { ACTIVITY_META, type FishingSpot } from "../../types/fishing";
import { SpeciesIcon } from "./SpeciesIcon";

export interface NotificationItem {
  id: string;
  spot: FishingSpot;
}

const AUTO_DISMISS_MS = 8000;

/** Floating "Your bro found fish!" stack. Pure UI: the app decides what to show. */
export function FishingNotificationStack({
  items,
  onView,
  onDismiss,
}: {
  items: NotificationItem[];
  onView: (item: NotificationItem) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <FishingNotification key={item.id} item={item} onView={onView} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FishingNotification({
  item,
  onView,
  onDismiss,
}: {
  item: NotificationItem;
  onView: (item: NotificationItem) => void;
  onDismiss: (id: string) => void;
}) {
  const { spot } = item;
  const meta = ACTIVITY_META[spot.activityLevel];
  const [paused, setPaused] = useState(false);
  const remaining = useRef(AUTO_DISMISS_MS);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const t = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, item.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -40, scale: 0.7, rotate: -3 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 480, damping: 17 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && onDismiss(item.id)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="glass pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[24px] p-2.5 pr-3"
      role="status"
    >
      <div className="flex items-center gap-2.5">
        <motion.span
          className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[18px]"
          style={{ background: meta.soft }}
          animate={{ y: [0, -4, 0, -2, 0], rotate: [0, -10, 8, -4, 0] }}
          transition={{ duration: 1, delay: 0.15 }}
        >
          <SpeciesIcon species={spot.fishType} size={40} />
          <span className="absolute -top-1.5 -right-1.5 text-base">{meta.emoji}</span>
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] leading-tight font-black text-ink">Your bro {spot.username} found fish!</p>
          <p className="truncate text-xs font-bold text-ink-soft">
            {bitingPhrase(spot.fishType, spot.activityLevel)}
            {spot.isSample && <span className="ml-1 text-[#c98500]">· sample</span>}
          </p>
        </div>
        <motion.button className="btn-view shrink-0" onClick={() => onView(item)} whileTap={{ scale: 0.9 }}>
          View Spot
        </motion.button>
      </div>
      <motion.span
        className="absolute bottom-0 left-0 h-[3px] rounded-full"
        style={{ background: meta.color }}
        initial={{ width: "100%" }}
        animate={{ width: paused ? undefined : "0%" }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}
