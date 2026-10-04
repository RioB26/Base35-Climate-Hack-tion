/** Sentinel Sniff mark: a methane plume rising from a three-terrace mound and turning into a leaf. Geometry from the brand kit (64×64). */
export function Mark({ size = 40, tone = "color", className }: { size?: number; tone?: "color" | "reverse"; className?: string }) {
  const ink = tone === "reverse" ? "#f6f4ef" : "#273c2c";
  const vein = tone === "reverse" ? "#273c2c" : "#f6f4ef";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <path d="M32 41 C24 35 39 30 33.5 23" fill="none" stroke="#e58f65" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M33.5 23 C32 12 41 5 56 5 C56 17 47 24 33.5 23 Z" fill={ink} />
      <path d="M36 20.5 L50 10" fill="none" stroke={vein} strokeWidth="2" strokeLinecap="round" />
      <path d="M5 58 H59 V51 H50 V45 H42 V39 H22 V45 H14 V51 H5 Z" fill={ink} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark plus a short status line, used while the lazy map and 3D chunks load. */
export function Loading({ label, className }: { label: string; className: string }) {
  return (
    <div className={`${className} brand-loading`} role="status">
      <Mark size={44} className="loading-mark" />
      <span>{label}</span>
    </div>
  );
}
