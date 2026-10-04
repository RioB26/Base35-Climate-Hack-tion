type HomeIconName = "landfill" | "satellite" | "leaf" | "methane" | "investment" | "energy";

/** Small decorative icons; detailed scene artwork lives in assets/home. */
export function HomeIcon({ name, className = "home-fact-icon" }: { name: HomeIconName; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {name === "methane" && <>
          <path d="M5 39h38M8 35l8-8h16l8 8" />
          <path d="M16 22c-6-7 6-8 0-15m9 15c-6-7 6-8 0-15m9 15c-6-7 6-8 0-15" stroke="#e58f65" />
        </>}
        {name === "investment" && <>
          <path d="M8 39V27h8v12m5 0V20h8v19m5 0V12h8v27M5 39h38" />
          <path d="m8 19 12-8 9 3L40 5m-8 0h8v8" stroke="#e58f65" />
        </>}
        {name === "energy" && <>
          <path d="M14 37h20m-18 5h16M16 32c0-5-7-7-7-16a15 15 0 0 1 30 0c0 9-7 11-7 16H16Z" />
          <path d="m26 9-8 13h7l-3 9 10-14h-8l2-8Z" fill="#e58f65" stroke="#e58f65" />
        </>}
        {name === "landfill" && <>
          <path d="M5 34 16 20l6 5 8-12 13 21H5Z" fill="#d9e2ce" />
          <path d="m5 34 11-9 7 6m0-6 7-7 13 16M5 37h38" />
        </>}
        {name === "satellite" && <g transform="rotate(-25 24 24)">
          <rect x="18" y="16" width="12" height="16" rx="2" fill="#516747" />
          <path d="M15 19H5v10h10V19Zm18 0h10v10H33V19Z" fill="#a9bb97" />
          <path d="M24 32v7m-5 0h10M10 19v10m28-10v10" />
        </g>}
        {name === "leaf" && <>
          <path d="M12 34C4 19 22 8 39 9c0 17-9 31-24 27" fill="#667f42" />
          <path d="M8 41c6-13 13-20 25-26" stroke="#f8f8ef" strokeWidth="2" />
        </>}
      </svg>
    </span>
  );
}
