type HomeIconName = "landfill" | "satellite" | "leaf";

/** Small decorative icons; detailed scene artwork lives in assets/home. */
export function HomeIcon({ name }: { name: HomeIconName }) {
  return (
    <span className="home-fact-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
