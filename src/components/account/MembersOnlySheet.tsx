import { BottomSheet } from "../ui/BottomSheet";
import { JoinForm } from "./JoinForm";

/** Shown when a guest taps a member feature. Upgrading keeps the same account. */
export function MembersOnlySheet({
  feature,
  onJoin,
  checkName,
  onClose,
  onHeightChange,
}: {
  feature: string;
  onJoin: (code: string, name: string) => Promise<unknown>;
  checkName: (name: string) => Promise<boolean>;
  onClose: () => void;
  onHeightChange: (h: number) => void;
}) {
  return (
    <BottomSheet label="Members only" onHeightChange={onHeightChange}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] leading-tight font-extrabold text-ink">🔒 Members only</h2>
          <p className="text-xs font-semibold text-ink-soft">{feature} is for members. Got an invite code?</p>
        </div>
        <button onClick={onClose} className="icon-btn icon-btn--sm" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="mt-3">
        <JoinForm onJoin={onJoin} checkName={checkName} submitLabel="Become a member" />
      </div>
    </BottomSheet>
  );
}
