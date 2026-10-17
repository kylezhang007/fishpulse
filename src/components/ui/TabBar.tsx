import { motion } from "motion/react";
import type { ReactNode } from "react";

export type TabId = "map" | "community" | "chat" | "me";

const TABS: { id: TabId; label: string; soon?: boolean; icon: ReactNode }[] = [
  {
    id: "map",
    label: "Map",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4 3.5 6.2v13.6L9 17.6l6 2.4 5.5-2.2V4.2L15 6.4 9 4Z" />
        <path d="M9 4v13.6M15 6.4V20" />
      </svg>
    ),
  },
  {
    id: "community",
    label: "Community",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8.5" r="3.5" />
        <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
        <circle cx="17" cy="7.5" r="2.6" />
        <path d="M16.5 13.2c2.8.1 4.5 1.8 5 4.6" />
      </svg>
    ),
  },
  {
    id: "me",
    label: "Me",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Chat",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 11.5c0 4.4-3.8 8-8.5 8-1.3 0-2.6-.3-3.7-.8L3.5 20l1.3-3.9a7.6 7.6 0 0 1-1.3-4.6c0-4.4 3.8-8 8.5-8s8.5 3.6 8.5 8Z" />
        <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="3" />
      </svg>
    ),
  },
];

/** App-level navigation: Map · Community · (Fish ID) · Chat · Me. Chat is "soon". */
export function TabBar({
  active,
  onChange,
  onScan,
  scanLocked,
  badges,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  onScan: () => void;
  scanLocked: boolean;
  /** Red-dot counts per tab (e.g. chat requests + unread). */
  badges?: Partial<Record<TabId, number>>;
}) {
  const order: TabId[] = ["map", "community", "chat", "me"];
  const tabs = order.map((id) => TABS.find((t) => t.id === id)!);
  return (
    <nav
      className="glass-strong pointer-events-auto mx-auto flex w-full max-w-lg items-stretch justify-around rounded-t-[28px] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] sm:mb-3 sm:rounded-[28px]"
      aria-label="Main"
    >
      {tabs.map((t, i) => {
        const on = t.id === active;
        const button = (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-extrabold transition-colors"
            style={{ color: on ? "#ff6b81" : "#9aa6bb" }}
            aria-current={on ? "page" : undefined}
          >
            {on && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-x-2 inset-y-1 rounded-2xl bg-coral-soft"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            )}
            <motion.span
              className="relative"
              animate={on ? { y: [0, -5, 0], rotate: [0, -8, 0] } : { y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {t.icon}
              {!!badges?.[t.id] && (
                <motion.span
                  key={badges[t.id]}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-coral px-1 text-[9px] font-black text-white"
                >
                  {badges[t.id]! > 9 ? "9+" : badges[t.id]}
                </motion.span>
              )}
              {t.soon && (
                <span className="absolute -top-1 -right-3 rounded-full bg-sun px-1 text-[8px] leading-[13px] font-black text-white">SOON</span>
              )}
            </motion.span>
            <span className="relative">{t.label}</span>
          </button>
        );
        if (i !== 2) return button;
        return [
          <div key="scan" className="relative flex flex-1 justify-center">
            <motion.button
              onClick={onScan}
              className="absolute -top-6 grid h-[58px] w-[58px] place-items-center rounded-full text-white"
              style={{
                background: "linear-gradient(145deg, #5cc8ff, #3fb2ff 55%, #4b8bff)",
                boxShadow: "0 0 0 5px #fff, 0 12px 24px -8px rgba(63,178,255,0.9)",
              }}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              aria-label={scanLocked ? "Fish ID (members only)" : "Identify a fish"}
            >
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
              {scanLocked && (
                <span className="absolute -right-0.5 -bottom-0.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[12px] shadow">🔒</span>
              )}
            </motion.button>
            <span className="mt-auto pb-1 text-[11px] font-extrabold text-ink-mute">Fish ID</span>
          </div>,
          button,
        ];
      })}
    </nav>
  );
}
