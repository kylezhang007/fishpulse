import { AnimatePresence, motion } from "motion/react";

export interface ToastMessage {
  id: number;
  tone: "success" | "error" | "info";
  text: string;
}

const TONE = {
  success: { cls: "text-[#139a6c]", icon: "🎉" },
  error: { cls: "text-[#d6455d]", icon: "😵" },
  info: { cls: "text-ink", icon: "💡" },
};

export function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="pointer-events-none flex justify-center" aria-live="assertive">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
            className={`glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${TONE[toast.tone].cls}`}
            role="status"
          >
            <motion.span animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] }} transition={{ duration: 0.6, delay: 0.1 }}>
              {TONE[toast.tone].icon}
            </motion.span>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
