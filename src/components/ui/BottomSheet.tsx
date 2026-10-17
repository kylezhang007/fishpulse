import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Mobile-first bottom sheet (centered card on desktop). Reports its height so the
 * map can pad its camera and keep the focus point visible above the sheet.
 */
export function BottomSheet({
  children,
  onHeightChange,
  label,
}: {
  children: ReactNode;
  onHeightChange?: (h: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onHeightChange);
  cb.current = onHeightChange;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => cb.current?.(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.section
      ref={ref}
      role="dialog"
      aria-label={label}
      className="glass-strong pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg rounded-t-[30px] px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+14px)] sm:bottom-4 sm:rounded-[30px]"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "110%" }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#e3e8f0]" aria-hidden="true" />
      {children}
    </motion.section>
  );
}
