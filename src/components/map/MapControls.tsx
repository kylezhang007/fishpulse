import type { GeoState } from "../../hooks/useGeolocation";

/** Floating right-side controls. Location is strictly opt-in and one-shot. */
export function MapControls({ geo, onLocate, onRecenter }: { geo: GeoState; onLocate: () => void; onRecenter: () => void }) {
  const locating = geo.status === "locating";
  return (
    <div className="flex flex-col gap-2.5">
      <button className="icon-btn" onClick={onLocate} aria-label="Show my location" title="Show my location (never shared)" disabled={locating}>
        {locating ? (
          <span className="fp-loader fp-loader--sm" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        )}
      </button>
      <button className="icon-btn" onClick={onRecenter} aria-label="Back to the lake" title="Back to the default area">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </button>
    </div>
  );
}
