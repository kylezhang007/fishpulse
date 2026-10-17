/**
 * Cute fish mascot: round body, big shiny eye, little smile and a blush.
 * `mood="happy"` closes the eye into a ^ for celebrations.
 */
export function FishIcon({
  size = 16,
  color = "#3fb2ff",
  className,
  mood = "normal",
}: {
  size?: number;
  color?: string;
  className?: string;
  mood?: "normal" | "happy";
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* tail */}
      <path d="M7.5 16 2 10.5c-.6-.6-1.6-.1-1.5.8L1.3 16 .5 20.7c-.1.9.9 1.4 1.5.8L7.5 16Z" fill={color} />
      {/* body */}
      <ellipse cx="17.5" cy="16" rx="12" ry="9.5" fill={color} />
      {/* belly shine */}
      <ellipse cx="16" cy="19.5" rx="7.5" ry="3.6" fill="#fff" opacity=".35" />
      {/* top fin */}
      <path d="M14 7.2c1.8-2.6 5-3.2 7-1.6-.9.8-1.4 1.8-1.6 3" fill={color} />
      {/* eye */}
      {mood === "happy" ? (
        <path d="M20.6 13.8c.8-1.4 2.6-1.4 3.4 0" stroke="#23314d" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="22.4" cy="13.6" r="2.6" fill="#23314d" />
          <circle cx="23.3" cy="12.7" r="0.9" fill="#fff" />
        </>
      )}
      {/* smile */}
      <path d="M24.6 18.2c.9.9 2.2.9 3 0" stroke="#23314d" strokeWidth="1.5" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="20" cy="18" rx="1.8" ry="1.1" fill="#ff8fa3" opacity=".75" />
    </svg>
  );
}
